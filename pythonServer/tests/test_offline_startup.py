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
