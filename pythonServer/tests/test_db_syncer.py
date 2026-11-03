import json
from contextlib import asynccontextmanager
from datetime import datetime

import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.db import repository
from src.db.models import Base, Visitor
from src.storage import db_syncer

PI_ID = "b8:27:eb:11:11:11"


@pytest_asyncio.fixture
async def session_factory() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_foreign_keys(dbapi_connection, connection_record) -> None:  # type: ignore[no-untyped-def]
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    return async_sessionmaker(engine, expire_on_commit=False)


def _write_visitors_file(day_dir, records: list[dict]) -> None:
    day_dir.mkdir(parents=True, exist_ok=True)
    with (day_dir / "visitors.jsonl").open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")


def _write_sessions_file(day_dir, records: list[dict]) -> None:
    day_dir.mkdir(parents=True, exist_ok=True)
    with (day_dir / "sessions.jsonl").open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")


def _session_record(visitor_id: str = "visitor-1") -> dict:
    return {
        "visitor_id": visitor_id,
        "started_at": "2026-08-05T09:00:00",
        "ended_at": "2026-08-05T09:00:20",
        "duration_seconds": 20,
    }


def _visitor_record(visitor_id: str = "visitor-1") -> dict:
    return {
        "visitor_id": visitor_id,
        "embedding": [0.1, 0.2, 0.3],
        "first_seen_at": "2026-08-05T08:55:00",
        "age": 32,
        "gender": "male",
    }


async def test_happy_path_syncs_sessions_for_known_visitor_and_moves_folder(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    async with session_factory() as session:
        await repository.upsert_visitor(
            session, "visitor-1", PI_ID, [0.1, 0.2, 0.3], datetime(2026, 8, 5, 8, 55, 0), age=32, gender="male"
        )
        await session.commit()

    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-05"]
    assert not day_dir.exists()
    assert (tmp_path / "processedData" / "2026-08-05" / "sessions.jsonl").exists()

    async with session_factory() as session:
        total = await repository.get_total_watch_time_seconds(session, PI_ID)
    assert total == 20


async def test_happy_path_syncs_new_visitor_and_session_together(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_visitors_file(day_dir, [_visitor_record()])
    _write_sessions_file(day_dir, [_session_record()])

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-05"]
    assert not day_dir.exists()

    async with session_factory() as session:
        known_faces = await repository.get_known_faces(session, PI_ID)
        total = await repository.get_total_watch_time_seconds(session, PI_ID)
        visitor = await session.get(Visitor, "visitor-1")

    assert [f.visitor_id for f in known_faces] == ["visitor-1"]
    assert total == 20
    assert visitor is not None
    assert visitor.age == 32
    assert visitor.gender == "male"


async def test_boundary_nothing_pending_returns_empty_list(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == []


async def test_boundary_multiple_days_all_synced_in_order(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    day1_dir = tmp_path / "syncData" / "2026-08-04"
    day2_dir = tmp_path / "syncData" / "2026-08-05"
    _write_visitors_file(day1_dir, [_visitor_record("visitor-1")])
    _write_sessions_file(day1_dir, [_session_record("visitor-1")])
    _write_visitors_file(day2_dir, [_visitor_record("visitor-2")])
    _write_sessions_file(day2_dir, [_session_record("visitor-2")])

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [
        tmp_path / "processedData" / "2026-08-04",
        tmp_path / "processedData" / "2026-08-05",
    ]
    assert not day1_dir.exists()
    assert not day2_dir.exists()


async def test_conflict_offline_returns_empty_list_and_touches_no_files(tmp_path) -> None:
    @asynccontextmanager
    async def _raising_session_factory():
        raise ConnectionError("simulated offline")
        yield  # pragma: no cover - unreachable, keeps this an async generator

    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])

    synced = await db_syncer.sync_pending(_raising_session_factory, tmp_path, PI_ID)

    assert synced == []
    assert day_dir.exists()


async def test_conflict_partial_failure_leaves_bad_day_untouched(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    good_day_dir = tmp_path / "syncData" / "2026-08-04"
    bad_day_dir = tmp_path / "syncData" / "2026-08-05"

    _write_sessions_file(good_day_dir, [_session_record("visitor-1")])
    async with session_factory() as session:
        await repository.upsert_visitor(
            session, "visitor-1", PI_ID, [0.1, 0.2, 0.3], datetime(2026, 8, 4, 8, 55, 0), age=32, gender="male"
        )
        await session.commit()

    # References a visitor that was never created — violates the sessions.visitor_id
    # foreign key, so this day's commit fails and must be left in place for retry.
    _write_sessions_file(bad_day_dir, [_session_record("visitor-does-not-exist")])

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-04"]
    assert not good_day_dir.exists()
    assert bad_day_dir.exists()


def _append_raw_line(day_dir, file_name: str, raw: bytes) -> None:
    with (day_dir / file_name).open("ab") as f:
        f.write(raw + b"\n")


async def _seed_visitor(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        await repository.upsert_visitor(
            session, "visitor-1", PI_ID, [0.1, 0.2, 0.3], datetime(2026, 8, 5, 8, 55, 0), age=32, gender="male"
        )
        await session.commit()


async def test_corruption_nul_prefixed_line_is_repaired_and_synced(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_visitor(session_factory)
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])
    # Power-loss artefact: a run of NUL bytes in front of an otherwise valid record.
    _append_raw_line(day_dir, "sessions.jsonl", b"\x00" * 50 + json.dumps(_session_record()).encode())

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-05"]
    async with session_factory() as session:
        total = await repository.get_total_watch_time_seconds(session, PI_ID)
    assert total == 40


async def test_corruption_unparseable_line_is_skipped_and_rest_of_day_synced(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_visitor(session_factory)
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])
    _append_raw_line(day_dir, "sessions.jsonl", b'{"visitor_id": "visitor-1", "started_at": "2026-08')

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-05"]
    assert not day_dir.exists()
    async with session_factory() as session:
        total = await repository.get_total_watch_time_seconds(session, PI_ID)
    assert total == 20


async def test_corruption_unparseable_line_is_preserved_in_corrupt_file(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_visitor(session_factory)
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])
    bad_line = b'{"visitor_id": "visitor-1", "started_at": "2026-08'
    _append_raw_line(day_dir, "sessions.jsonl", bad_line)

    await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    corrupt_file = tmp_path / "processedData" / "2026-08-05" / "sessions.jsonl.corrupt"
    assert corrupt_file.read_bytes() == bad_line + b"\n"


async def test_corruption_visitors_file_is_also_tolerant(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_visitors_file(day_dir, [_visitor_record("visitor-1")])
    _append_raw_line(day_dir, "visitors.jsonl", b"\x00\x00\x00 not json")
    _write_sessions_file(day_dir, [_session_record("visitor-1")])

    synced = await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert synced == [tmp_path / "processedData" / "2026-08-05"]
    async with session_factory() as session:
        total = await repository.get_total_watch_time_seconds(session, PI_ID)
    assert total == 20


async def test_boundary_clean_files_produce_no_corrupt_file(
    tmp_path, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_visitor(session_factory)
    day_dir = tmp_path / "syncData" / "2026-08-05"
    _write_sessions_file(day_dir, [_session_record()])

    await db_syncer.sync_pending(session_factory, tmp_path, PI_ID)

    assert list((tmp_path / "processedData" / "2026-08-05").glob("*.corrupt")) == []
