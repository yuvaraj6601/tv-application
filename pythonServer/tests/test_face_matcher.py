import numpy as np

from src.recognition.face_matcher import KnownFace, match_face


def _cosine_distance(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    similarity = float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))
    return 1.0 - similarity


def test_happy_path_matches_closest_known_face() -> None:
    known_faces = [
        KnownFace(visitor_id="visitor-1", embedding=[1.0, 0.0, 0.0]),
        KnownFace(visitor_id="visitor-2", embedding=[0.0, 1.0, 0.0]),
    ]

    matched_id = match_face([1.0, 0.0, 0.0], known_faces, distance_threshold=0.5)

    assert matched_id == "visitor-1"


def test_unknown_face_returns_none_new_visitor() -> None:
    known_faces = [KnownFace(visitor_id="visitor-1", embedding=[1.0, 0.0, 0.0])]

    matched_id = match_face([0.0, 1.0, 0.0], known_faces, distance_threshold=0.5)

    assert matched_id is None


def test_boundary_distance_exactly_at_threshold_matches() -> None:
    known_embedding = [1.0, 0.0, 0.0]
    candidate_embedding = [0.6, 0.8, 0.0]
    threshold = _cosine_distance(known_embedding, candidate_embedding)

    known_faces = [KnownFace(visitor_id="visitor-1", embedding=known_embedding)]

    matched_id = match_face(candidate_embedding, known_faces, distance_threshold=threshold)

    assert matched_id == "visitor-1"


def test_boundary_distance_just_over_threshold_does_not_match() -> None:
    known_embedding = [1.0, 0.0, 0.0]
    candidate_embedding = [0.6, 0.8, 0.0]
    threshold = _cosine_distance(known_embedding, candidate_embedding) - 0.01

    known_faces = [KnownFace(visitor_id="visitor-1", embedding=known_embedding)]

    matched_id = match_face(candidate_embedding, known_faces, distance_threshold=threshold)

    assert matched_id is None


def test_validation_empty_known_faces_returns_none() -> None:
    matched_id = match_face([1.0, 0.0, 0.0], [], distance_threshold=0.5)

    assert matched_id is None
