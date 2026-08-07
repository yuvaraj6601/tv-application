from datetime import date, datetime
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


def test_process_frame_happy_path_records_presence_for_detected_face(tmp_path, monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    fake_face = SimpleNamespace(
        embedding=np.array([0.1, 0.2, 0.3]), bbox=np.array([0.0, 0.0, 10.0, 10.0]), age=30.0, gender=1
    )

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([fake_face]))

    registry = UserRegistry()
    tracker = SessionTracker()

    main.process_frame(frame, registry, tracker, tmp_path, distance_threshold=0.5, now=NOW)

    closed = tracker.close_expired_sessions(NOW, absence_timeout_seconds=0)
    assert len(closed) == 1
    assert closed[0].started_at == NOW


def test_process_frame_boundary_no_faces_records_nothing(tmp_path, monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([]))

    registry = UserRegistry()
    tracker = SessionTracker()

    main.process_frame(frame, registry, tracker, tmp_path, distance_threshold=0.5, now=NOW)

    closed = tracker.close_expired_sessions(NOW, absence_timeout_seconds=0)
    assert closed == []


def test_flush_expired_sessions_happy_path_writes_closed_sessions(tmp_path) -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", NOW)

    closed = main.flush_expired_sessions(tracker, tmp_path, absence_timeout_seconds=0, now=NOW)

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


def test_rotate_previous_day_happy_path_rotates_yesterday(tmp_path) -> None:
    yesterday_dir = tmp_path / "temporaryData" / "2026-08-04"
    yesterday_dir.mkdir(parents=True)
    (yesterday_dir / "sessions.jsonl").write_text('{"visitor_id": "v1"}\n', encoding="utf-8")

    result = main.rotate_previous_day(tmp_path, today=date(2026, 8, 5))

    assert result == tmp_path / "syncData" / "2026-08-04"
    assert not yesterday_dir.exists()


def test_rotate_previous_day_boundary_nothing_to_rotate_returns_none(tmp_path) -> None:
    result = main.rotate_previous_day(tmp_path, today=date(2026, 8, 5))

    assert result is None
