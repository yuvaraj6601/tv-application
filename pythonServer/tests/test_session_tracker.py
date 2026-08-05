from datetime import datetime, timedelta

from src.session.session_tracker import SessionTracker

BASE_TIME = datetime(2026, 8, 5, 10, 0, 0)


def test_happy_path_open_extend_close() -> None:
    tracker = SessionTracker()

    tracker.record_presence("visitor-1", BASE_TIME)
    tracker.record_presence("visitor-1", BASE_TIME + timedelta(seconds=10))

    closed = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=45), absence_timeout_seconds=30)

    assert len(closed) == 1
    session = closed[0]
    assert session.visitor_id == "visitor-1"
    assert session.started_at == BASE_TIME
    assert session.ended_at == BASE_TIME + timedelta(seconds=10)
    assert session.duration_seconds == 10


def test_boundary_just_under_timeout_stays_open() -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", BASE_TIME)

    closed = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=29), absence_timeout_seconds=30)

    assert closed == []


def test_boundary_exactly_at_timeout_closes() -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", BASE_TIME)

    closed = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=30), absence_timeout_seconds=30)

    assert len(closed) == 1
    assert closed[0].visitor_id == "visitor-1"


def test_conflict_repeated_presence_before_timeout_stays_one_session() -> None:
    tracker = SessionTracker()

    for offset in range(0, 20, 2):
        tracker.record_presence("visitor-1", BASE_TIME + timedelta(seconds=offset))

    closed = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=60), absence_timeout_seconds=30)

    assert len(closed) == 1
    assert closed[0].started_at == BASE_TIME
    assert closed[0].ended_at == BASE_TIME + timedelta(seconds=18)


def test_multiple_visitors_tracked_independently() -> None:
    tracker = SessionTracker()

    tracker.record_presence("visitor-1", BASE_TIME)
    tracker.record_presence("visitor-2", BASE_TIME + timedelta(seconds=5))
    tracker.record_presence("visitor-2", BASE_TIME + timedelta(seconds=15))

    closed = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=100), absence_timeout_seconds=30)

    visitor_ids = {session.visitor_id for session in closed}
    assert visitor_ids == {"visitor-1", "visitor-2"}

    visitor_2_session = next(s for s in closed if s.visitor_id == "visitor-2")
    assert visitor_2_session.duration_seconds == 10


def test_closed_sessions_no_longer_reported_on_subsequent_calls() -> None:
    tracker = SessionTracker()
    tracker.record_presence("visitor-1", BASE_TIME)

    first_call = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=30), absence_timeout_seconds=30)
    second_call = tracker.close_expired_sessions(BASE_TIME + timedelta(seconds=60), absence_timeout_seconds=30)

    assert len(first_call) == 1
    assert second_call == []
