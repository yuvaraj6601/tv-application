from datetime import datetime

from src.recognition.face_matcher import KnownFace
from src.recognition.user_registry import UserRegistry

DISTANCE_THRESHOLD = 0.6
FIRST_SEEN_AT = datetime(2026, 8, 5, 9, 0, 0)


def test_happy_path_new_embedding_creates_visitor_and_returns_pending_record() -> None:
    registry = UserRegistry()

    visitor_id, record = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )

    assert visitor_id
    assert record is not None
    assert record.visitor_id == visitor_id
    assert record.age == 28
    assert record.gender == "male"


def test_conflict_repeated_similar_embedding_returns_same_visitor_no_new_record() -> None:
    registry = UserRegistry()

    first_id, _ = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )
    second_id, second_record = registry.identify_or_register(
        [0.99, 0.14, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=29, gender="male"
    )

    assert second_id == first_id
    assert second_record is None


def test_boundary_distinct_embeddings_create_distinct_visitors() -> None:
    registry = UserRegistry()

    first_id, first_record = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )
    second_id, second_record = registry.identify_or_register(
        [0.0, 1.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=35, gender="female"
    )

    assert first_id != second_id
    assert first_record is not None
    assert second_record is not None


def test_validation_preloaded_known_face_matches_without_new_record() -> None:
    registry = UserRegistry(known_faces=[KnownFace(visitor_id="visitor-preloaded", embedding=[1.0, 0.0, 0.0])])

    visitor_id, record = registry.identify_or_register(
        [0.99, 0.14, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=40, gender="female"
    )

    assert visitor_id == "visitor-preloaded"
    assert record is None


def test_conflict_forgotten_visitor_is_registered_as_new_when_face_returns() -> None:
    registry = UserRegistry()

    first_id, _ = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )
    registry.forget(first_id)
    second_id, second_record = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )

    assert second_id != first_id
    assert second_record is not None
    assert second_record.visitor_id == second_id


def test_boundary_forget_unknown_visitor_is_a_no_op() -> None:
    registry = UserRegistry()
    known_id, _ = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )

    registry.forget("not-a-visitor")

    matched_id, record = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, age=28, gender="male"
    )
    assert matched_id == known_id
    assert record is None
