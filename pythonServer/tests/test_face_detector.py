import numpy as np

from src.capture import face_detector


def test_happy_path_one_face_returns_one_detection(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    fake_location = (0, 10, 10, 0)
    fake_encoding = np.array([0.1, 0.2, 0.3])

    monkeypatch.setattr(face_detector.face_recognition, "face_locations", lambda f: [fake_location])
    monkeypatch.setattr(face_detector.face_recognition, "face_encodings", lambda f, locations: [fake_encoding])

    detections = face_detector.detect_faces(frame)

    assert len(detections) == 1
    assert detections[0].bounding_box == fake_location
    assert detections[0].embedding == [0.1, 0.2, 0.3]


def test_boundary_zero_faces_returns_empty_list(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)

    monkeypatch.setattr(face_detector.face_recognition, "face_locations", lambda f: [])
    monkeypatch.setattr(face_detector.face_recognition, "face_encodings", lambda f, locations: [])

    detections = face_detector.detect_faces(frame)

    assert detections == []


def test_boundary_multiple_faces_returns_multiple_detections(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    locations = [(0, 10, 10, 0), (20, 30, 30, 20)]
    encodings = [np.array([0.1, 0.2]), np.array([0.3, 0.4])]

    monkeypatch.setattr(face_detector.face_recognition, "face_locations", lambda f: locations)
    monkeypatch.setattr(face_detector.face_recognition, "face_encodings", lambda f, locs: encodings)

    detections = face_detector.detect_faces(frame)

    assert len(detections) == 2
    assert detections[0].embedding == [0.1, 0.2]
    assert detections[1].embedding == [0.3, 0.4]
