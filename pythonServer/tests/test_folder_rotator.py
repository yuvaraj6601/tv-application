from datetime import date

from src.storage.folder_rotator import rotate_day

DAY = date(2026, 8, 5)


def test_happy_path_moves_whole_folder_when_no_existing_sync_folder(tmp_path) -> None:
    temp_day_dir = tmp_path / "temporaryData" / DAY.isoformat()
    temp_day_dir.mkdir(parents=True)
    (temp_day_dir / "sessions.jsonl").write_text('{"visitor_id": "v1"}\n', encoding="utf-8")

    result = rotate_day(tmp_path, DAY)

    sync_day_dir = tmp_path / "syncData" / DAY.isoformat()
    assert result == sync_day_dir
    assert not temp_day_dir.exists()
    assert (sync_day_dir / "sessions.jsonl").read_text(encoding="utf-8") == '{"visitor_id": "v1"}\n'


def test_not_found_no_temporary_folder_returns_none(tmp_path) -> None:
    result = rotate_day(tmp_path, DAY)

    assert result is None
    assert not (tmp_path / "syncData" / DAY.isoformat()).exists()


def test_conflict_merges_into_existing_partial_sync_folder(tmp_path) -> None:
    sync_day_dir = tmp_path / "syncData" / DAY.isoformat()
    sync_day_dir.mkdir(parents=True)
    (sync_day_dir / "sessions.jsonl").write_text('{"visitor_id": "old-1"}\n', encoding="utf-8")

    temp_day_dir = tmp_path / "temporaryData" / DAY.isoformat()
    temp_day_dir.mkdir(parents=True)
    (temp_day_dir / "sessions.jsonl").write_text('{"visitor_id": "new-1"}\n', encoding="utf-8")

    result = rotate_day(tmp_path, DAY)

    assert result == sync_day_dir
    assert not temp_day_dir.exists()
    merged_content = (sync_day_dir / "sessions.jsonl").read_text(encoding="utf-8")
    assert merged_content == '{"visitor_id": "old-1"}\n{"visitor_id": "new-1"}\n'


def test_boundary_mixed_overlap_moves_new_files_and_merges_shared_files(tmp_path) -> None:
    sync_day_dir = tmp_path / "syncData" / DAY.isoformat()
    sync_day_dir.mkdir(parents=True)
    (sync_day_dir / "sessions.jsonl").write_text('{"visitor_id": "old-1"}\n', encoding="utf-8")

    temp_day_dir = tmp_path / "temporaryData" / DAY.isoformat()
    temp_day_dir.mkdir(parents=True)
    (temp_day_dir / "sessions.jsonl").write_text('{"visitor_id": "new-1"}\n', encoding="utf-8")
    (temp_day_dir / "visitors.jsonl").write_text('{"visitor_id": "new-1", "new": true}\n', encoding="utf-8")

    result = rotate_day(tmp_path, DAY)

    assert result == sync_day_dir
    assert not temp_day_dir.exists()
    assert (sync_day_dir / "sessions.jsonl").read_text(encoding="utf-8") == (
        '{"visitor_id": "old-1"}\n{"visitor_id": "new-1"}\n'
    )
    assert (sync_day_dir / "visitors.jsonl").read_text(encoding="utf-8") == (
        '{"visitor_id": "new-1", "new": true}\n'
    )


def test_boundary_empty_source_folder_cleaned_up_without_creating_sync_folder(tmp_path) -> None:
    temp_day_dir = tmp_path / "temporaryData" / DAY.isoformat()
    temp_day_dir.mkdir(parents=True)

    result = rotate_day(tmp_path, DAY)

    assert result is None
    assert not temp_day_dir.exists()
    assert not (tmp_path / "syncData" / DAY.isoformat()).exists()


def test_boundary_empty_source_folder_with_existing_sync_folder_returns_dest(tmp_path) -> None:
    sync_day_dir = tmp_path / "syncData" / DAY.isoformat()
    sync_day_dir.mkdir(parents=True)
    (sync_day_dir / "sessions.jsonl").write_text('{"visitor_id": "old-1"}\n', encoding="utf-8")

    temp_day_dir = tmp_path / "temporaryData" / DAY.isoformat()
    temp_day_dir.mkdir(parents=True)

    result = rotate_day(tmp_path, DAY)

    assert result == sync_day_dir
    assert not temp_day_dir.exists()
    assert (sync_day_dir / "sessions.jsonl").read_text(encoding="utf-8") == '{"visitor_id": "old-1"}\n'
