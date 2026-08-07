from datetime import date, datetime

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.db import repository
from src.db.models import Base, Visitor
from src.session.session_tracker import FinalizedSession

PI_ID_A = "b8:27:eb:11:11:11"
PI_ID_B = "b8:27:eb:22:22:22"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


async def test_happy_path_upsert_then_get_known_faces_round_trips(db_session: AsyncSession) -> None:
    created = await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[0.1, 0.2, 0.3],
        first_seen_at=datetime(2026, 8, 5, 9, 0, 0),
        age=30,
        gender="male",
    )
    await db_session.commit()

    known_faces = await repository.get_known_faces(db_session, PI_ID_A)

    assert created is True
    assert len(known_faces) == 1
    assert known_faces[0].visitor_id == "visitor-1"
    assert known_faces[0].embedding == [0.1, 0.2, 0.3]


async def test_happy_path_upsert_visitor_persists_age_and_gender(db_session: AsyncSession) -> None:
    await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[0.1, 0.2, 0.3],
        first_seen_at=datetime(2026, 8, 5, 9, 0, 0),
        age=27,
        gender="female",
    )
    await db_session.commit()

    visitor = await db_session.get(Visitor, "visitor-1")

    assert visitor is not None
    assert visitor.age == 27
    assert visitor.gender == "female"


async def test_conflict_upsert_visitor_twice_stays_one_row(db_session: AsyncSession) -> None:
    first_created = await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[0.1, 0.2, 0.3],
        first_seen_at=datetime(2026, 8, 5, 9, 0, 0),
        age=30,
        gender="male",
    )
    await db_session.commit()

    second_created = await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[9.9, 9.9, 9.9],
        first_seen_at=datetime(2026, 8, 5, 10, 0, 0),
        age=31,
        gender="male",
    )
    await db_session.commit()

    known_faces = await repository.get_known_faces(db_session, PI_ID_A)

    assert first_created is True
    assert second_created is False
    assert len(known_faces) == 1
    assert known_faces[0].embedding == [0.1, 0.2, 0.3]


async def test_boundary_get_known_faces_no_visitors_returns_empty_list(db_session: AsyncSession) -> None:
    known_faces = await repository.get_known_faces(db_session, PI_ID_A)

    assert known_faces == []


async def test_boundary_get_known_faces_scoped_per_pi_id(db_session: AsyncSession) -> None:
    await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[0.1, 0.2],
        first_seen_at=datetime(2026, 8, 5, 9, 0, 0),
        age=30,
        gender="male",
    )
    await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-2",
        pi_id=PI_ID_B,
        embedding=[0.3, 0.4],
        first_seen_at=datetime(2026, 8, 5, 9, 5, 0),
        age=45,
        gender="female",
    )
    await db_session.commit()

    known_faces_a = await repository.get_known_faces(db_session, PI_ID_A)
    known_faces_b = await repository.get_known_faces(db_session, PI_ID_B)

    assert [f.visitor_id for f in known_faces_a] == ["visitor-1"]
    assert [f.visitor_id for f in known_faces_b] == ["visitor-2"]


async def test_happy_path_insert_sessions_creates_rows(db_session: AsyncSession) -> None:
    await repository.upsert_visitor(
        db_session,
        visitor_id="visitor-1",
        pi_id=PI_ID_A,
        embedding=[0.1, 0.2],
        first_seen_at=datetime(2026, 8, 5, 9, 0, 0),
        age=30,
        gender="male",
    )
    await db_session.commit()

    sessions = [
        FinalizedSession(
            visitor_id="visitor-1",
            started_at=datetime(2026, 8, 5, 9, 0, 0),
            ended_at=datetime(2026, 8, 5, 9, 0, 20),
            duration_seconds=20,
        ),
        FinalizedSession(
            visitor_id="visitor-1",
            started_at=datetime(2026, 8, 5, 10, 0, 0),
            ended_at=datetime(2026, 8, 5, 10, 0, 5),
            duration_seconds=5,
        ),
    ]

    await repository.insert_sessions(db_session, PI_ID_A, sessions)
    await db_session.commit()

    total_duration = await repository.get_total_watch_time_seconds(db_session, PI_ID_A)
    assert total_duration == 25


async def test_validation_insert_sessions_empty_list_is_noop(db_session: AsyncSession) -> None:
    await repository.insert_sessions(db_session, PI_ID_A, [])
    await db_session.commit()

    total_duration = await repository.get_total_watch_time_seconds(db_session, PI_ID_A)
    assert total_duration == 0


async def test_happy_path_record_sync_creates_row(db_session: AsyncSession) -> None:
    await repository.record_sync(db_session, PI_ID_A, date(2026, 8, 5), rows_synced=3)
    await db_session.commit()

    rows_synced = await repository.get_rows_synced(db_session, PI_ID_A, date(2026, 8, 5))
    assert rows_synced == 3


async def test_conflict_record_sync_twice_same_day_accumulates(db_session: AsyncSession) -> None:
    await repository.record_sync(db_session, PI_ID_A, date(2026, 8, 5), rows_synced=3)
    await db_session.commit()

    await repository.record_sync(db_session, PI_ID_A, date(2026, 8, 5), rows_synced=2)
    await db_session.commit()

    rows_synced = await repository.get_rows_synced(db_session, PI_ID_A, date(2026, 8, 5))
    assert rows_synced == 5
