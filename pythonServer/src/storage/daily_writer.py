from datetime import date, datetime
from pathlib import Path

from pydantic import BaseModel

from src.session.session_tracker import FinalizedSession


class NewVisitorRecord(BaseModel):
    visitor_id: str
    embedding: list[float]
    first_seen_at: datetime
    age: int
    gender: str


def _append_jsonl_line(data_dir: str | Path, day: date, file_name: str, line: str) -> Path:
    day_dir = Path(data_dir) / "temporaryData" / day.isoformat()
    day_dir.mkdir(parents=True, exist_ok=True)

    file_path = day_dir / file_name
    with file_path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")

    return file_path


def write_session(session: FinalizedSession, data_dir: str | Path, day: date | None = None) -> Path:
    target_day = day or session.started_at.date()
    return _append_jsonl_line(data_dir, target_day, "sessions.jsonl", session.model_dump_json())


def write_new_visitor(record: NewVisitorRecord, data_dir: str | Path, day: date | None = None) -> Path:
    target_day = day or record.first_seen_at.date()
    return _append_jsonl_line(data_dir, target_day, "visitors.jsonl", record.model_dump_json())
