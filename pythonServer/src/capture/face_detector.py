import face_recognition
import numpy as np
from pydantic import BaseModel


class FaceDetection(BaseModel):
    embedding: list[float]
    bounding_box: tuple[int, int, int, int]


def detect_faces(frame: np.ndarray) -> list[FaceDetection]:
    locations = face_recognition.face_locations(frame)
    encodings = face_recognition.face_encodings(frame, locations)

    return [
        FaceDetection(embedding=list(encoding), bounding_box=location)
        for location, encoding in zip(locations, encodings)
    ]
