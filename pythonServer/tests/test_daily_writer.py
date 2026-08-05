import json
from datetime import date, datetime

from src.session.session_tracker import FinalizedSession
from src.storage.daily_writer import write_session


def _sample_session(visitor_id: str = "visitor-1") -> FinalizedSession:
    return FinalizedSession(
        visitor_id=visitor_id,
        started_at=datetime(2026, 8, 5, 10, 0, 0),
        ended_at=datetime(2026, 8, 5, 10, 0, 20),
        duration_seconds=20,
    )


def test_happy_path_writes_one_line_and_creates_folder(tmp_path) -> None:
    session = _sample_session()

    file_path = write_session(session, data_dir=tmp_path)

    expected_dir = tmp_path / "temporaryData" / "2026-08-05"
    assert file_path == expected_dir / "sessions.jsonl"
    assert file_path.exists()

    lines = file_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1


def test_boundary_second_write_appends_not_overwrites(tmp_path) -> None:
    write_session(_sample_session("visitor-1"), data_dir=tmp_path)
    file_path = write_session(_sample_session("visitor-2"), data_dir=tmp_path)

    lines = file_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2


def test_validation_session_data_round_trips_through_json(tmp_path) -> None:
    session = _sample_session()

    file_path = write_session(session, data_dir=tmp_path)

    line = file_path.read_text(encoding="utf-8").strip().splitlines()[0]
    restored = FinalizedSession.model_validate(json.loads(line))

    assert restored == session


def test_explicit_day_overrides_session_started_at_date(tmp_path) -> None:
    session = _sample_session()

    file_path = write_session(session, data_dir=tmp_path, day=date(2026, 1, 1))

    assert file_path == tmp_path / "temporaryData" / "2026-01-01" / "sessions.jsonl"
