from types import SimpleNamespace

import numpy as np

from src.capture import face_detector


class _FakeAnalysis:
    def __init__(self, faces: list) -> None:
        self._faces = faces

    def get(self, frame: np.ndarray) -> list:
        return self._faces


def test_happy_path_one_face_returns_one_detection(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    fake_face = SimpleNamespace(embedding=np.array([0.1, 0.2, 0.3]), bbox=np.array([0.0, 1.0, 10.0, 11.0]))

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([fake_face]))

    detections = face_detector.detect_faces(frame)

    assert len(detections) == 1
    assert detections[0].embedding == [0.1, 0.2, 0.3]
    assert detections[0].bounding_box == (0, 1, 10, 11)


def test_boundary_zero_faces_returns_empty_list(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([]))

    detections = face_detector.detect_faces(frame)

    assert detections == []


def test_boundary_multiple_faces_returns_multiple_detections(monkeypatch) -> None:
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    face_1 = SimpleNamespace(embedding=np.array([0.1, 0.2]), bbox=np.array([0.0, 0.0, 10.0, 10.0]))
    face_2 = SimpleNamespace(embedding=np.array([0.3, 0.4]), bbox=np.array([20.0, 20.0, 30.0, 30.0]))

    monkeypatch.setattr(face_detector, "_get_face_analysis", lambda: _FakeAnalysis([face_1, face_2]))

    detections = face_detector.detect_faces(frame)

    assert len(detections) == 2
    assert detections[0].embedding == [0.1, 0.2]
    assert detections[1].embedding == [0.3, 0.4]
    assert detections[0].bounding_box == (0, 0, 10, 10)
    assert detections[1].bounding_box == (20, 20, 30, 30)


def test_lazy_loading_only_initializes_analysis_once(monkeypatch) -> None:
    load_count = {"count": 0}

    def _fake_loader() -> _FakeAnalysis:
        load_count["count"] += 1
        return _FakeAnalysis([])

    monkeypatch.setattr(face_detector, "_face_analysis", None)
    monkeypatch.setattr(face_detector, "_load_face_analysis", _fake_loader)

    face_detector.detect_faces(np.zeros((5, 5, 3), dtype=np.uint8))
    face_detector.detect_faces(np.zeros((5, 5, 3), dtype=np.uint8))

    assert load_count["count"] == 1
