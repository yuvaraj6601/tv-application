import uuid
from datetime import date, datetime

from sqlalchemy import DateTime, Date, ForeignKey, Index, Integer, LargeBinary, String, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Visitor(Base):
    __tablename__ = "visitors"
    __table_args__ = (UniqueConstraint("pi_id", "id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pi_id: Mapped[str] = mapped_column(String(17), index=True)
    face_embedding: Mapped[bytes] = mapped_column(LargeBinary)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("ix_sessions_pi_id_started_at", "pi_id", "started_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pi_id: Mapped[str] = mapped_column(String(17), index=True)
    visitor_id: Mapped[str] = mapped_column(String(36), ForeignKey("visitors.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    ended_at: Mapped[datetime] = mapped_column(DateTime)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    synced_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SyncLog(Base):
    __tablename__ = "sync_log"
    __table_args__ = (UniqueConstraint("pi_id", "sync_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pi_id: Mapped[str] = mapped_column(String(17))
    sync_date: Mapped[date] = mapped_column(Date)
    rows_synced: Mapped[int] = mapped_column(Integer)
    synced_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
