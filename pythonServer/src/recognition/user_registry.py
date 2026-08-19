import uuid
from datetime import datetime

from src.recognition.face_matcher import KnownFace, match_face
from src.storage.daily_writer import NewVisitorRecord


class UserRegistry:
    def __init__(self, known_faces: list[KnownFace] | None = None) -> None:
        self._known_faces: list[KnownFace] = list(known_faces) if known_faces else []

    def identify_or_register(
        self,
        embedding: list[float],
        first_seen_at: datetime,
        distance_threshold: float,
        age: int,
        gender: str,
    ) -> tuple[str, NewVisitorRecord | None]:
        matched_visitor_id = match_face(embedding, self._known_faces, distance_threshold)
        if matched_visitor_id is not None:
            return matched_visitor_id, None

        new_visitor_id = str(uuid.uuid4())
        self._known_faces.append(KnownFace(visitor_id=new_visitor_id, embedding=embedding))
        record = NewVisitorRecord(
            visitor_id=new_visitor_id,
            embedding=embedding,
            first_seen_at=first_seen_at,
            age=age,
            gender=gender,
        )
        return new_visitor_id, record
