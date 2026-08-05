from src.recognition.face_matcher import KnownFace, match_face

DISTANCE_THRESHOLD = 0.6


def test_happy_path_matches_closest_known_face() -> None:
    known_faces = [
        KnownFace(visitor_id="visitor-1", embedding=[0.0, 0.0, 0.0]),
        KnownFace(visitor_id="visitor-2", embedding=[5.0, 5.0, 5.0]),
    ]

    matched_id = match_face([0.05, 0.0, 0.0], known_faces, DISTANCE_THRESHOLD)

    assert matched_id == "visitor-1"


def test_unknown_face_returns_none_new_visitor() -> None:
    known_faces = [KnownFace(visitor_id="visitor-1", embedding=[0.0, 0.0, 0.0])]

    matched_id = match_face([10.0, 10.0, 10.0], known_faces, DISTANCE_THRESHOLD)

    assert matched_id is None


def test_boundary_distance_exactly_at_threshold_matches() -> None:
    known_faces = [KnownFace(visitor_id="visitor-1", embedding=[0.0, 0.0, 0.0])]

    matched_id = match_face([0.6, 0.0, 0.0], known_faces, DISTANCE_THRESHOLD)

    assert matched_id == "visitor-1"


def test_boundary_distance_just_over_threshold_does_not_match() -> None:
    known_faces = [KnownFace(visitor_id="visitor-1", embedding=[0.0, 0.0, 0.0])]

    matched_id = match_face([0.61, 0.0, 0.0], known_faces, DISTANCE_THRESHOLD)

    assert matched_id is None


def test_validation_empty_known_faces_returns_none() -> None:
    matched_id = match_face([0.0, 0.0, 0.0], [], DISTANCE_THRESHOLD)

    assert matched_id is None
