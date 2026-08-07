from typing import Protocol

import numpy as np
from pydantic import BaseModel


class FaceDetection(BaseModel):
    embedding: list[float]
    bounding_box: tuple[int, int, int, int]
    age: int
    gender: str


class _DetectedFace(Protocol):
    embedding: np.ndarray
    bbox: np.ndarray
    age: float
    gender: int


class _FaceAnalysis(Protocol):
    def get(self, frame: np.ndarray) -> list[_DetectedFace]: ...


_face_analysis: _FaceAnalysis | None = None


def _load_face_analysis() -> _FaceAnalysis:
    from insightface.app import FaceAnalysis

    raw_analysis = FaceAnalysis(name="buffalo_s")
    raw_analysis.prepare(ctx_id=-1, det_size=(640, 640))

    analysis: _FaceAnalysis = raw_analysis
    return analysis


def _get_face_analysis() -> _FaceAnalysis:
    global _face_analysis
    if _face_analysis is None:
        _face_analysis = _load_face_analysis()
    return _face_analysis


def detect_faces(frame: np.ndarray) -> list[FaceDetection]:
    faces = _get_face_analysis().get(frame)

    detections = []
    for face in faces:
        x1, y1, x2, y2 = face.bbox
        detections.append(
            FaceDetection(
                embedding=list(face.embedding),
                bounding_box=(int(x1), int(y1), int(x2), int(y2)),
                age=round(face.age),
                gender="male" if face.gender == 1 else "female",
            )
        )

    return detections
