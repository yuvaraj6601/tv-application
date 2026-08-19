import asyncio
import logging
from datetime import date, datetime
from pathlib import Path

import getmac
import numpy as np
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.capture.camera_capture import CameraCapture
from src.capture.face_detector import detect_faces
from src.config.settings import settings
from src.db.connection import SessionLocal, connect_db
from src.db.repository import get_known_faces
from src.logging_config import configure_logging
from src.recognition.user_registry import UserRegistry
from src.session.session_tracker import FinalizedSession, SessionTracker
from src.storage.daily_writer import NewVisitorRecord, write_new_visitor, write_session
from src.storage.db_syncer import sync_pending
from src.storage.folder_rotator import rotate_day

logger = logging.getLogger(__name__)


def resolve_pi_id(environment: str, configured_pi_id: str) -> str:
    if environment == "production":
        return str(getmac.get_mac_address())
    return configured_pi_id


def process_frame(
    frame: np.ndarray,
    registry: UserRegistry,
    tracker: SessionTracker,
    distance_threshold: float,
    now: datetime,
) -> dict[str, NewVisitorRecord]:
    new_records: dict[str, NewVisitorRecord] = {}
    for detection in detect_faces(frame):
        visitor_id, new_record = registry.identify_or_register(
            detection.embedding, now, distance_threshold, detection.age, detection.gender
        )
        if new_record is not None:
            new_records[visitor_id] = new_record
        tracker.record_presence(visitor_id, now)
    return new_records


def flush_expired_sessions(
    tracker: SessionTracker,
    data_dir: str | Path,
    absence_timeout_seconds: int,
    now: datetime,
    pending_new_visitors: dict[str, NewVisitorRecord] | None = None,
) -> list[FinalizedSession]:
    closed = tracker.close_expired_sessions(now, absence_timeout_seconds)
    written: list[FinalizedSession] = []
    for session in closed:
        pending_record = pending_new_visitors.pop(session.visitor_id, None) if pending_new_visitors else None
        if session.duration_seconds == 0:
            continue

        write_session(session, data_dir)
        if pending_record is not None:
            write_new_visitor(pending_record, data_dir)
        written.append(session)
    return written


def rotate_stale_days(data_dir: str | Path, today: date) -> list[Path]:
    temporary_data_dir = Path(data_dir) / "temporaryData"
    if not temporary_data_dir.exists():
        return []

    stale_days = []
    for entry in temporary_data_dir.iterdir():
        if not entry.is_dir():
            continue
        try:
            day = date.fromisoformat(entry.name)
        except ValueError:
            continue
        if day < today:
            stale_days.append(day)

    rotated = []
    for day in sorted(stale_days):
        dest_dir = rotate_day(data_dir, day)
        if dest_dir is not None:
            rotated.append(dest_dir)
    return rotated


async def run() -> None:
    configure_logging()
    await connect_db()

    pi_id = resolve_pi_id(settings.environment, settings.pi_id)
    logger.info("Starting pythonServer for pi_id=%s", pi_id)

    async with SessionLocal() as session:
        known_faces = await get_known_faces(session, pi_id)
    registry = UserRegistry(known_faces=known_faces)
    tracker = SessionTracker()
    pending_new_visitors: dict[str, NewVisitorRecord] = {}

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        lambda: rotate_stale_days(settings.data_dir, date.today()),
        "interval",
        seconds=settings.rotation_check_interval_seconds,
    )
    scheduler.add_job(
        sync_pending,
        "interval",
        seconds=settings.sync_interval_seconds,
        args=[SessionLocal, settings.data_dir, pi_id],
    )
    scheduler.start()

    capture = CameraCapture(frame_width=settings.camera_frame_width, frame_height=settings.camera_frame_height)
    capture.open()
    try:
        while True:
            frame = capture.read_frame()
            now = datetime.now()
            new_records = process_frame(frame, registry, tracker, settings.face_match_distance_threshold, now)
            pending_new_visitors.update(new_records)
            flush_expired_sessions(
                tracker, settings.data_dir, settings.absence_timeout_seconds, now, pending_new_visitors
            )
            await asyncio.sleep(settings.capture_interval_seconds)
    finally:
        capture.close()
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(run())
