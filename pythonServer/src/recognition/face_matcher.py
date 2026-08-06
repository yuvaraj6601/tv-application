import numpy as np
from pydantic import BaseModel


class KnownFace(BaseModel):
    visitor_id: str
    embedding: list[float]


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    similarity = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    return 1.0 - similarity


def match_face(
    embedding: list[float],
    known_faces: list[KnownFace],
    distance_threshold: float,
) -> str | None:
    if not known_faces:
        return None

    candidate = np.array(embedding)
    distances = [_cosine_distance(np.array(face.embedding), candidate) for face in known_faces]

    best_index = int(np.argmin(distances))
    if distances[best_index] <= distance_threshold:
        return known_faces[best_index].visitor_id

    return None
