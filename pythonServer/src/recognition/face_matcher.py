import face_recognition
import numpy as np
from pydantic import BaseModel


class KnownFace(BaseModel):
    visitor_id: str
    embedding: list[float]


def match_face(
    embedding: list[float],
    known_faces: list[KnownFace],
    distance_threshold: float,
) -> str | None:
    if not known_faces:
        return None

    known_encodings = [np.array(face.embedding) for face in known_faces]
    distances = face_recognition.face_distance(known_encodings, np.array(embedding))

    best_index = int(np.argmin(distances))
    if distances[best_index] <= distance_threshold:
        return known_faces[best_index].visitor_id

    return None
