import asyncio
import logging
from datetime import date, datetime, timedelta
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
from src.storage.daily_writer import write_session
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
    data_dir: str | Path,
    distance_threshold: float,
    now: datetime,
) -> None:
    for detection in detect_faces(frame):
        visitor_id = registry.identify_or_register(detection.embedding, now, distance_threshold, data_dir)
        tracker.record_presence(visitor_id, now)


def flush_expired_sessions(
    tracker: SessionTracker,
    data_dir: str | Path,
    absence_timeout_seconds: int,
    now: datetime,
) -> list[FinalizedSession]:
    closed = tracker.close_expired_sessions(now, absence_timeout_seconds)
    for session in closed:
        write_session(session, data_dir)
    return closed


def rotate_previous_day(data_dir: str | Path, today: date) -> Path | None:
    return rotate_day(data_dir, today - timedelta(days=1))


async def run() -> None:
    configure_logging()
    await connect_db()

    pi_id = resolve_pi_id(settings.environment, settings.pi_id)
    logger.info("Starting pythonServer for pi_id=%s", pi_id)

    async with SessionLocal() as session:
        known_faces = await get_known_faces(session, pi_id)
    registry = UserRegistry(known_faces=known_faces)
    tracker = SessionTracker()

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        lambda: rotate_previous_day(settings.data_dir, date.today()),
        "interval",
        seconds=settings.rotation_check_interval_seconds,
    )
    scheduler.add_job(
        lambda: asyncio.ensure_future(sync_pending(SessionLocal, settings.data_dir, pi_id)),
        "interval",
        seconds=settings.sync_interval_seconds,
    )
    scheduler.start()

    capture = CameraCapture()
    capture.open()
    try:
        while True:
            frame = capture.read_frame()
            now = datetime.now()
            process_frame(frame, registry, tracker, settings.data_dir, settings.face_match_distance_threshold, now)
            flush_expired_sessions(tracker, settings.data_dir, settings.absence_timeout_seconds, now)
            await asyncio.sleep(settings.capture_interval_seconds)
    finally:
        capture.close()
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(run())
