from datetime import datetime

from pydantic import BaseModel


class FinalizedSession(BaseModel):
    visitor_id: str
    started_at: datetime
    ended_at: datetime
    duration_seconds: int


class _OpenSession(BaseModel):
    first_seen_at: datetime
    last_seen_at: datetime


class SessionTracker:
    def __init__(self) -> None:
        self._open_sessions: dict[str, _OpenSession] = {}

    def record_presence(self, visitor_id: str, at: datetime) -> None:
        existing = self._open_sessions.get(visitor_id)
        if existing is None:
            self._open_sessions[visitor_id] = _OpenSession(first_seen_at=at, last_seen_at=at)
        else:
            existing.last_seen_at = at

    def close_expired_sessions(self, now: datetime, absence_timeout_seconds: int) -> list[FinalizedSession]:
        expired_visitor_ids = [
            visitor_id
            for visitor_id, session in self._open_sessions.items()
            if (now - session.last_seen_at).total_seconds() >= absence_timeout_seconds
        ]

        finalized: list[FinalizedSession] = []
        for visitor_id in expired_visitor_ids:
            session = self._open_sessions.pop(visitor_id)
            duration = int((session.last_seen_at - session.first_seen_at).total_seconds())
            finalized.append(
                FinalizedSession(
                    visitor_id=visitor_id,
                    started_at=session.first_seen_at,
                    ended_at=session.last_seen_at,
                    duration_seconds=duration,
                )
            )

        return finalized
