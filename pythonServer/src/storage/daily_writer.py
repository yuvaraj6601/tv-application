from datetime import date
from pathlib import Path

from src.session.session_tracker import FinalizedSession


def write_session(session: FinalizedSession, data_dir: str | Path, day: date | None = None) -> Path:
    target_day = day or session.started_at.date()
    day_dir = Path(data_dir) / "temporaryData" / target_day.isoformat()
    day_dir.mkdir(parents=True, exist_ok=True)

    file_path = day_dir / "sessions.jsonl"
    with file_path.open("a", encoding="utf-8") as f:
        f.write(session.model_dump_json() + "\n")

    return file_path
