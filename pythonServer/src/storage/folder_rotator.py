import shutil
from datetime import date
from pathlib import Path


def rotate_day(data_dir: str | Path, day: date) -> Path | None:
    source_dir = Path(data_dir) / "temporaryData" / day.isoformat()
    dest_dir = Path(data_dir) / "syncData" / day.isoformat()

    if not source_dir.exists():
        return None

    source_files = [f for f in source_dir.iterdir() if f.is_file()]

    if not dest_dir.exists():
        if not source_files:
            source_dir.rmdir()
            return None
        shutil.move(str(source_dir), str(dest_dir))
        return dest_dir

    for source_file in source_files:
        dest_file = dest_dir / source_file.name
        if dest_file.exists():
            with dest_file.open("a", encoding="utf-8") as dest_handle:
                dest_handle.write(source_file.read_text(encoding="utf-8"))
            source_file.unlink()
        else:
            shutil.move(str(source_file), str(dest_file))

    source_dir.rmdir()
    return dest_dir
