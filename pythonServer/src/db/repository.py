import json
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import SyncLog
from src.db.models import Session as SessionModel
from src.db.models import Visitor
from src.recognition.face_matcher import KnownFace
from src.session.session_tracker import FinalizedSession


async def get_known_faces(session: AsyncSession, pi_id: str) -> list[KnownFace]:
    result = await session.execute(select(Visitor).where(Visitor.pi_id == pi_id))
    visitors = result.scalars().all()

    return [
        KnownFace(visitor_id=visitor.id, embedding=json.loads(visitor.face_embedding.decode("utf-8")))
        for visitor in visitors
    ]


async def upsert_visitor(
    session: AsyncSession,
    visitor_id: str,
    pi_id: str,
    embedding: list[float],
    first_seen_at: datetime,
) -> bool:
    existing = await session.get(Visitor, visitor_id)
    if existing is not None:
        return False

    session.add(
        Visitor(
            id=visitor_id,
            pi_id=pi_id,
            face_embedding=json.dumps(embedding).encode("utf-8"),
            first_seen_at=first_seen_at,
        )
    )
    return True


async def insert_sessions(session: AsyncSession, pi_id: str, sessions: list[FinalizedSession]) -> None:
    for finalized in sessions:
        session.add(
            SessionModel(
                pi_id=pi_id,
                visitor_id=finalized.visitor_id,
                started_at=finalized.started_at,
                ended_at=finalized.ended_at,
                duration_seconds=finalized.duration_seconds,
            )
        )


async def record_sync(session: AsyncSession, pi_id: str, sync_date: date, rows_synced: int) -> None:
    result = await session.execute(
        select(SyncLog).where(SyncLog.pi_id == pi_id, SyncLog.sync_date == sync_date)
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing.rows_synced += rows_synced
    else:
        session.add(SyncLog(pi_id=pi_id, sync_date=sync_date, rows_synced=rows_synced))


async def get_total_watch_time_seconds(session: AsyncSession, pi_id: str) -> int:
    result = await session.execute(
        select(func.coalesce(func.sum(SessionModel.duration_seconds), 0)).where(SessionModel.pi_id == pi_id)
    )
    return int(result.scalar_one())


async def get_rows_synced(session: AsyncSession, pi_id: str, sync_date: date) -> int:
    result = await session.execute(
        select(SyncLog.rows_synced).where(SyncLog.pi_id == pi_id, SyncLog.sync_date == sync_date)
    )
    value = result.scalar_one_or_none()
    return value if value is not None else 0
