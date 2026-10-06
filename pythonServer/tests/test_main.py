import json
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import numpy as np

from src import main
from src.capture import face_detector
from src.recognition.user_registry import UserRegistry
from src.session.session_tracker import SessionTracker

NOW = datetime(2026, 8, 5, 10, 0, 0)


class _FakeAnalysis:
    def __init__(self, faces: list) -> None:
        self._faces = faces

    def get(self, frame: np.ndarray) -> list:
        return self._faces


def test_resolve_pi_id_production_uses_getmac(monkeypatch) -> None:
    monkeypatch.setattr(main.getmac, "get_mac_address", lambda: "b8:27:eb:11:11:11")

    pi_id = main.resolve_pi_id("production", "local-dev-test")

    assert pi_id == "b8:27:eb:11:11:11"


def test_resolve_pi_id_local_uses_configured_value(monkeypatch) -> None:
    monkeypatch.setattr(main.getmac, "get_mac_address", lambda: "should-not-be-used")

    pi_id = main.resolve_pi_id("local", "local-dev-test")

    assert pi_id == "local-dev-test"


def test_process_frame_happy_path_records_presence_for_detected_face(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    fake_face = SimpleNamespace(
        embedding=np.array([0.1, 0.2, 0.3]), bbox=np.array([0.0, 0.0, 10.0, 10.0]), age=30.0, gender=1
    )

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([fake_face]))

    registry = UserRegistry()
    tracker = SessionTracker()

    new_records = main.process_frame(frame, registry, tracker, distance_threshold=0.5, now=NOW)

    assert len(new_records) == 1
    closed = tracker.close_expired_sessions(NOW, absence_timeout_seconds=0)
    assert len(closed) == 1
    assert closed[0].started_at == NOW


def test_process_frame_boundary_no_faces_records_nothing(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([]))

    registry = UserRegistry()
    tracker = SessionTracker()

    new_records = main.process_frame(frame, registry, tracker, distance_threshold=0.5, now=NOW)

    assert new_records == {}
    closed = tracker.close_expired_sessions(NOW, absence_timeout_seconds=0)
    assert closed == []


def test_flush_expired_sessions_happy_path_writes_closed_sessions(tmp_path) -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)
    from datetime import timedelta

    tracker.record_presence("visitor-1", NOW + timedelta(seconds=5))

    closed = main.flush_expired_sessions(tracker, tmp_path, absence_timeout_seconds=0, now=NOW + timedelta(seconds=5))

    assert len(closed) == 1
    file_path = tmp_path / "temporaryData" / "2026-08-05" / "sessions.jsonl"
    assert file_path.exists()
    assert len(file_path.read_text(encoding="utf-8").strip().splitlines()) == 1


def test_flush_expired_sessions_boundary_nothing_expired_writes_nothing(tmp_path) -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)

    closed = main.flush_expired_sessions(tracker, tmp_path, absence_timeout_seconds=9999, now=NOW)

    assert closed == []
    assert not (tmp_path / "temporaryData" / "2026-08-05" / "sessions.jsonl").exists()


def test_conflict_zero_duration_session_is_discarded_and_not_written(tmp_path) -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)

    closed = main.flush_expired_sessions(tracker, tmp_path, absence_timeout_seconds=0, now=NOW)

    assert closed == []
    assert not (tmp_path / "temporaryData" / "2026-08-05" / "sessions.jsonl").exists()


def test_conflict_zero_duration_new_visitor_is_discarded_and_not_written(tmp_path) -> None:
    from src.storage.daily_writer import NewVisitorRecord

    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)
    pending_new_visitors = {
        "visitor-1": NewVisitorRecord(
            visitor_id="visitor-1", embedding=[1.0, 0.0, 0.0], first_seen_at=NOW, age=28, gender="male"
        )
    }

    closed = main.flush_expired_sessions(
        tracker, tmp_path, absence_timeout_seconds=0, now=NOW, pending_new_visitors=pending_new_visitors
    )

    assert closed == []
    assert pending_new_visitors == {}
    assert not (tmp_path / "temporaryData" / "2026-08-05" / "visitors.jsonl").exists()


def test_conflict_zero_duration_new_visitor_is_forgotten_by_registry(tmp_path) -> None:
    registry = UserRegistry()
    tracker = SessionTracker()
    visitor_id, record = registry.identify_or_register(
        [1.0, 0.0, 0.0], NOW, distance_threshold=0.5, age=28, gender="male"
    )
    assert record is not None
    tracker.record_presence(visitor_id, NOW)
    pending_new_visitors = {visitor_id: record}

    main.flush_expired_sessions(
        tracker,
        tmp_path,
        absence_timeout_seconds=0,
        now=NOW,
        pending_new_visitors=pending_new_visitors,
        registry=registry,
    )

    returning_id, returning_record = registry.identify_or_register(
        [1.0, 0.0, 0.0], NOW + timedelta(minutes=5), distance_threshold=0.5, age=28, gender="male"
    )
    assert returning_id != visitor_id
    assert returning_record is not None
    assert not (tmp_path / "temporaryData" / "2026-08-05").exists()


def test_boundary_zero_duration_known_visitor_stays_in_registry(tmp_path) -> None:
    registry = UserRegistry()
    tracker = SessionTracker()
    known_id, _ = registry.identify_or_register([1.0, 0.0, 0.0], NOW, distance_threshold=0.5, age=28, gender="male")
    tracker.record_presence(known_id, NOW + timedelta(minutes=1))

    main.flush_expired_sessions(
        tracker,
        tmp_path,
        absence_timeout_seconds=0,
        now=NOW + timedelta(minutes=1),
        pending_new_visitors={},
        registry=registry,
    )

    matched_id, record = registry.identify_or_register(
        [1.0, 0.0, 0.0], NOW + timedelta(minutes=5), distance_threshold=0.5, age=28, gender="male"
    )
    assert matched_id == known_id
    assert record is None


def test_conflict_every_written_session_has_a_visitor_record_after_glimpse_then_return(tmp_path, monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    fake_face = SimpleNamespace(
        embedding=np.array([1.0, 0.0, 0.0]), bbox=np.array([0.0, 0.0, 10.0, 10.0]), age=30.0, gender=1
    )
    seen_faces: list = []
    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis(seen_faces))

    registry = UserRegistry()
    tracker = SessionTracker()
    pending_new_visitors: dict = {}

    def tick(at: datetime, face_visible: bool) -> None:
        seen_faces[:] = [fake_face] if face_visible else []
        pending_new_visitors.update(main.process_frame(frame, registry, tracker, distance_threshold=0.5, now=at))
        main.flush_expired_sessions(
            tracker,
            tmp_path,
            absence_timeout_seconds=8,
            now=at,
            pending_new_visitors=pending_new_visitors,
            registry=registry,
        )

    tick(NOW, True)
    tick(NOW + timedelta(seconds=10), False)
    tick(NOW + timedelta(minutes=5), True)
    tick(NOW + timedelta(minutes=5, seconds=6), True)
    tick(NOW + timedelta(minutes=6), False)

    day_dir = tmp_path / "temporaryData" / "2026-08-05"
    session_rows = [json.loads(line) for line in (day_dir / "sessions.jsonl").read_text(encoding="utf-8").splitlines()]
    visitor_rows = [json.loads(line) for line in (day_dir / "visitors.jsonl").read_text(encoding="utf-8").splitlines()]

    assert len(session_rows) == 1
    assert {row["visitor_id"] for row in session_rows} == {row["visitor_id"] for row in visitor_rows}
    assert datetime.fromisoformat(visitor_rows[0]["first_seen_at"]) == NOW + timedelta(minutes=5)


def test_happy_path_nonzero_duration_new_visitor_is_written(tmp_path) -> None:
    from datetime import timedelta

    from src.storage.daily_writer import NewVisitorRecord

    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)
    tracker.record_presence("visitor-1", NOW + timedelta(seconds=5))
    pending_new_visitors = {
        "visitor-1": NewVisitorRecord(
            visitor_id="visitor-1", embedding=[1.0, 0.0, 0.0], first_seen_at=NOW, age=28, gender="male"
        )
    }

    closed = main.flush_expired_sessions(
        tracker,
        tmp_path,
        absence_timeout_seconds=0,
        now=NOW + timedelta(seconds=5),
        pending_new_visitors=pending_new_visitors,
    )

    assert len(closed) == 1
    assert pending_new_visitors == {}
    file_path = tmp_path / "temporaryData" / "2026-08-05" / "visitors.jsonl"
    assert file_path.exists()
    assert len(file_path.read_text(encoding="utf-8").strip().splitlines()) == 1


def test_rotate_stale_days_happy_path_rotates_yesterday(tmp_path) -> None:
    yesterday_dir = tmp_path / "temporaryData" / "2026-08-04"
    yesterday_dir.mkdir(parents=True)
    (yesterday_dir / "sessions.jsonl").write_text('{"visitor_id": "v1"}\n', encoding="utf-8")

    result = main.rotate_stale_days(tmp_path, today=date(2026, 8, 5))

    assert result == [tmp_path / "syncData" / "2026-08-04"]
    assert not yesterday_dir.exists()


def test_rotate_stale_days_boundary_nothing_to_rotate_returns_empty(tmp_path) -> None:
    result = main.rotate_stale_days(tmp_path, today=date(2026, 8, 5))

    assert result == []


def test_rotate_stale_days_rotates_multiple_old_dates_but_not_today(tmp_path) -> None:
    old_dir = tmp_path / "temporaryData" / "2026-08-01"
    old_dir.mkdir(parents=True)
    (old_dir / "sessions.jsonl").write_text('{"visitor_id": "v1"}\n', encoding="utf-8")

    yesterday_dir = tmp_path / "temporaryData" / "2026-08-04"
    yesterday_dir.mkdir(parents=True)
    (yesterday_dir / "sessions.jsonl").write_text('{"visitor_id": "v2"}\n', encoding="utf-8")

    today_dir = tmp_path / "temporaryData" / "2026-08-05"
    today_dir.mkdir(parents=True)
    (today_dir / "sessions.jsonl").write_text('{"visitor_id": "v3"}\n', encoding="utf-8")

    result = main.rotate_stale_days(tmp_path, today=date(2026, 8, 5))

    assert result == [
        tmp_path / "syncData" / "2026-08-01",
        tmp_path / "syncData" / "2026-08-04",
    ]
    assert not old_dir.exists()
    assert not yesterday_dir.exists()
    assert today_dir.exists()
