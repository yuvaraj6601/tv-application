import asyncio
import json
from datetime import datetime
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.db import repository
from src.db.connection import check_db_connection
from src.db.models import Base
from src.recognition.face_matcher import KnownFace
from src.recognition.known_faces_loader import load_known_faces, refresh_known_faces
from src.recognition.user_registry import UserRegistry
from src.storage.db_syncer import sync_pending

PI_ID = "b8:27:eb:11:11:11"
FIRST_SEEN_AT = datetime(2026, 8, 5, 9, 0, 0)
DISTANCE_THRESHOLD = 0.6


@pytest_asyncio.fixture
async def session_factory() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
def unreachable_factory(tmp_path: Path) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/missing-dir/db.sqlite")
    return async_sessionmaker(engine, expire_on_commit=False)


async def _seed_visitor(factory: async_sessionmaker[AsyncSession], visitor_id: str, embedding: list[float]) -> None:
    async with factory() as session:
        await repository.upsert_visitor(session, visitor_id, PI_ID, embedding, FIRST_SEEN_AT, age=30, gender="male")
        await session.commit()


# --- check_db_connection ---------------------------------------------------


async def test_check_db_connection_returns_true_when_db_reachable(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    assert await check_db_connection(session_factory) is True


async def test_check_db_connection_returns_false_and_does_not_raise_when_db_unreachable(
    unreachable_factory: async_sessionmaker[AsyncSession],
) -> None:
    assert await check_db_connection(unreachable_factory) is False


# --- load_known_faces ------------------------------------------------------


async def test_load_known_faces_reads_from_db_and_writes_cache(
    session_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    await _seed_visitor(session_factory, "v-1", [1.0, 0.0, 0.0])
    cache_path = tmp_path / "knownFaces.json"

    faces, from_db = await load_known_faces(session_factory, PI_ID, cache_path)

    assert from_db is True
    assert [f.visitor_id for f in faces] == ["v-1"]
    assert cache_path.exists()


async def test_load_known_faces_falls_back_to_cache_when_db_unreachable(
    unreachable_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    cache_path = tmp_path / "knownFaces.json"
    cache_path.write_text(json.dumps([{"visitor_id": "v-cached", "embedding": [0.0, 1.0, 0.0]}]), encoding="utf-8")

    faces, from_db = await load_known_faces(unreachable_factory, PI_ID, cache_path)

    assert from_db is False
    assert [f.visitor_id for f in faces] == ["v-cached"]


async def test_load_known_faces_returns_empty_when_db_unreachable_and_no_cache(
    unreachable_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    faces, from_db = await load_known_faces(unreachable_factory, PI_ID, tmp_path / "knownFaces.json")

    assert from_db is False
    assert faces == []


async def test_load_known_faces_ignores_corrupt_cache_file(
    unreachable_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    cache_path = tmp_path / "knownFaces.json"
    cache_path.write_text("{not valid json", encoding="utf-8")

    faces, from_db = await load_known_faces(unreachable_factory, PI_ID, cache_path)

    assert from_db is False
    assert faces == []


# --- UserRegistry.merge_known_faces ----------------------------------------


def test_merge_known_faces_adds_new_faces_and_skips_existing_ids() -> None:
    registry = UserRegistry(known_faces=[KnownFace(visitor_id="v-1", embedding=[1.0, 0.0, 0.0])])

    registry.merge_known_faces(
        [
            KnownFace(visitor_id="v-1", embedding=[0.5, 0.5, 0.0]),
            KnownFace(visitor_id="v-2", embedding=[0.0, 1.0, 0.0]),
        ]
    )

    visitor_id, record = registry.identify_or_register(
        [0.0, 1.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=20, gender="female"
    )
    assert visitor_id == "v-2"
    assert record is None


# --- refresh_known_faces ---------------------------------------------------


async def test_refresh_known_faces_merges_db_faces_into_registry_when_back_online(
    session_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    await _seed_visitor(session_factory, "v-db", [0.0, 0.0, 1.0])
    registry = UserRegistry()

    refreshed = await refresh_known_faces(registry, session_factory, PI_ID, tmp_path / "knownFaces.json")

    assert refreshed is True
    visitor_id, record = registry.identify_or_register(
        [0.0, 0.0, 1.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=20, gender="female"
    )
    assert visitor_id == "v-db"
    assert record is None


async def test_refresh_known_faces_returns_false_and_leaves_registry_untouched_when_offline(
    unreachable_factory: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    registry = UserRegistry(known_faces=[KnownFace(visitor_id="v-1", embedding=[1.0, 0.0, 0.0])])

    refreshed = await refresh_known_faces(registry, unreachable_factory, PI_ID, tmp_path / "knownFaces.json")

    assert refreshed is False
    visitor_id, record = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=20, gender="female"
    )
    assert visitor_id == "v-1"
    assert record is None


# --- hanging DB (network up, no internet): calls must give up quickly ------


class _HangingSession:
    async def __aenter__(self) -> "_HangingSession":
        await asyncio.Event().wait()
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None


def _hanging_factory() -> _HangingSession:
    return _HangingSession()


async def test_check_db_connection_returns_false_when_db_hangs() -> None:
    result = await asyncio.wait_for(check_db_connection(_hanging_factory, timeout_seconds=0.2), 2)  # type: ignore[arg-type]

    assert result is False


async def test_load_known_faces_uses_cache_when_db_hangs(tmp_path: Path) -> None:
    cache_path = tmp_path / "knownFaces.json"
    cache_path.write_text(json.dumps([{"visitor_id": "v-cached", "embedding": [0.0, 1.0, 0.0]}]), encoding="utf-8")

    faces, from_db = await asyncio.wait_for(
        load_known_faces(_hanging_factory, PI_ID, cache_path, timeout_seconds=0.2),  # type: ignore[arg-type]
        2,
    )

    assert from_db is False
    assert [f.visitor_id for f in faces] == ["v-cached"]


async def test_refresh_known_faces_returns_false_when_db_hangs(tmp_path: Path) -> None:
    refreshed = await asyncio.wait_for(
        refresh_known_faces(UserRegistry(), _hanging_factory, PI_ID, tmp_path / "k.json", timeout_seconds=0.2),  # type: ignore[arg-type]
        2,
    )

    assert refreshed is False


async def test_sync_pending_skips_quickly_when_db_hangs(tmp_path: Path) -> None:
    (tmp_path / "syncData" / "2026-10-07").mkdir(parents=True)

    result = await asyncio.wait_for(
        sync_pending(_hanging_factory, tmp_path, PI_ID, timeout_seconds=0.2),  # type: ignore[arg-type]
        2,
    )

    assert result == []
    assert (tmp_path / "syncData" / "2026-10-07").exists()
