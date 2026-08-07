import json
from datetime import datetime

from src.recognition.face_matcher import KnownFace
from src.recognition.user_registry import UserRegistry

DISTANCE_THRESHOLD = 0.6
FIRST_SEEN_AT = datetime(2026, 8, 5, 9, 0, 0)


def _visitors_file_lines(tmp_path) -> list[str]:
    file_path = tmp_path / "temporaryData" / "2026-08-05" / "visitors.jsonl"
    if not file_path.exists():
        return []
    return file_path.read_text(encoding="utf-8").strip().splitlines()


def test_happy_path_new_embedding_creates_visitor_and_writes_record(tmp_path) -> None:
    registry = UserRegistry()

    visitor_id = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=28, gender="male"
    )

    assert visitor_id
    lines = _visitors_file_lines(tmp_path)
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["age"] == 28
    assert record["gender"] == "male"


def test_conflict_repeated_similar_embedding_returns_same_visitor_no_extra_write(tmp_path) -> None:
    registry = UserRegistry()

    first_id = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=28, gender="male"
    )
    second_id = registry.identify_or_register(
        [0.99, 0.14, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=29, gender="male"
    )

    assert second_id == first_id
    assert len(_visitors_file_lines(tmp_path)) == 1


def test_boundary_distinct_embeddings_create_distinct_visitors(tmp_path) -> None:
    registry = UserRegistry()

    first_id = registry.identify_or_register(
        [1.0, 0.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=28, gender="male"
    )
    second_id = registry.identify_or_register(
        [0.0, 1.0, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=35, gender="female"
    )

    assert first_id != second_id
    assert len(_visitors_file_lines(tmp_path)) == 2


def test_validation_preloaded_known_face_matches_without_writing(tmp_path) -> None:
    registry = UserRegistry(known_faces=[KnownFace(visitor_id="visitor-preloaded", embedding=[1.0, 0.0, 0.0])])

    visitor_id = registry.identify_or_register(
        [0.99, 0.14, 0.0], FIRST_SEEN_AT, DISTANCE_THRESHOLD, tmp_path, age=40, gender="female"
    )

    assert visitor_id == "visitor-preloaded"
    assert _visitors_file_lines(tmp_path) == []
