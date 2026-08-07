import json
import logging
import shutil
from datetime import date as date_type
from pathlib import Path
from typing import AsyncContextManager, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from src.db import repository
from src.session.session_tracker import FinalizedSession
from src.storage.daily_writer import NewVisitorRecord

logger = logging.getLogger(__name__)

SessionFactory = Callable[[], AsyncContextManager[AsyncSession]]


def _read_jsonl(file_path: Path) -> list[dict[str, object]]:
    if not file_path.exists():
        return []
    with file_path.open("r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


async def _sync_day(session: AsyncSession, pi_id: str, day_dir: Path) -> int:
    visitor_records = [NewVisitorRecord.model_validate(row) for row in _read_jsonl(day_dir / "visitors.jsonl")]
    session_records = [FinalizedSession.model_validate(row) for row in _read_jsonl(day_dir / "sessions.jsonl")]

    for visitor in visitor_records:
        await repository.upsert_visitor(
            session, visitor.visitor_id, pi_id, visitor.embedding, visitor.first_seen_at, visitor.age, visitor.gender
        )

    # Visitor and Session aren't linked via an ORM relationship(), so the flush's
    # unit-of-work dependency sort doesn't know sessions must be inserted after
    # their visitor — flush explicitly to persist visitors before the FK-dependent
    # session rows are added.
    await session.flush()

    await repository.insert_sessions(session, pi_id, session_records)

    rows_synced = len(visitor_records) + len(session_records)
    sync_date = date_type.fromisoformat(day_dir.name)
    await repository.record_sync(session, pi_id, sync_date, rows_synced)

    return rows_synced


async def sync_pending(session_factory: SessionFactory, data_dir: str | Path, pi_id: str) -> list[Path]:
    sync_data_dir = Path(data_dir) / "syncData"
    processed_data_dir = Path(data_dir) / "processedData"

    try:
        async with session_factory() as probe_session:
            await probe_session.connection()
    except Exception as err:
        logger.info("pythonServer DB unreachable, skipping sync: %s", err)
        return []

    if not sync_data_dir.exists():
        return []

    synced_dirs: list[Path] = []
    for day_dir in sorted(p for p in sync_data_dir.iterdir() if p.is_dir()):
        try:
            async with session_factory() as session:
                rows_synced = await _sync_day(session, pi_id, day_dir)
                await session.commit()
        except Exception as err:
            logger.error("Failed to sync %s, will retry later: %s", day_dir, err)
            continue

        dest_dir = processed_data_dir / day_dir.name
        dest_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(day_dir), str(dest_dir))
        synced_dirs.append(dest_dir)
        logger.info("Synced %s rows from %s", rows_synced, day_dir)

    return synced_dirs
