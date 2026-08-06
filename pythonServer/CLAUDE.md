@~/.claude/skills/python.md

# TV Application — pythonServer

## Stack
- Plain Python service (no HTTP API) — no FastAPI/routers
- DB: SQLAlchemy 2.0 (async) + shared central MySQL DB (`pythonServer` DB, separate from the Node backend's `spatiabox_db`)
- Runs on each Raspberry Pi; locally the same code runs against the developer's own webcam
- Package management: `uv` + `pyproject.toml` + `uv.lock`
- Migrations: Alembic (`alembic/`, `alembic.ini`) — sync `pymysql` driver for migrations, async `aiomysql` for the running service
- See [../docs/PLAN.md](../docs/PLAN.md) for full architecture, DB schema, and build order

## Architecture
capture -> detect -> match/register -> session-track -> daily write, with rotate/sync scheduled
via APScheduler in main.py's run() loop. Wired end to end — see src/main.py.

## Source structure
src/
  capture/           camera_capture.py, face_detector.py
  recognition/        face_matcher.py, user_registry.py
  session/            session_tracker.py
  storage/            daily_writer.py, folder_rotator.py, db_syncer.py
  db/                 models.py, connection.py, repository.py
  config/             settings.py
  main.py             entry point — full run() loop + resolve_pi_id/process_frame/flush_expired_sessions/rotate_previous_day
deploy/
  pythonserver.service  systemd unit — runs `uv run python -m src.main` on boot, restarts on failure

## Modules (add one line per module as features are built)
src/session/session_tracker.py     — SessionTracker: record_presence(visitor_id, at), close_expired_sessions(now, absence_timeout_seconds) -> list[FinalizedSession]; in-memory continuous-presence state machine
src/recognition/face_matcher.py    — match_face(embedding, known_faces, distance_threshold) -> visitor_id | None; KnownFace pydantic model; uses cosine distance (1 - cosine similarity), matching InsightFace/ArcFace embeddings — confirmed target threshold range 0.4-0.6
src/recognition/user_registry.py   — UserRegistry: identify_or_register(embedding, first_seen_at, distance_threshold, data_dir) -> visitor_id; matches against an in-memory KnownFace cache (seeded from repository.get_known_faces at startup), mints a new UUID + calls daily_writer.write_new_visitor on no match
src/capture/face_detector.py       — detect_faces(frame) -> list[FaceDetection]; wraps insightface.app.FaceAnalysis (buffalo_s model pack, CPU-only via ctx_id=-1); model is lazy-loaded on first call via _get_face_analysis()/_load_face_analysis() (cached thereafter) — never import-time-loaded, so importing this module stays cheap and tests never need real model files
src/capture/camera_capture.py      — CameraCapture: open()/read_frame()/close() wrapping cv2.VideoCapture, raises CameraCaptureError on failure
src/storage/daily_writer.py        — write_session(session, data_dir, day=None) -> Path; write_new_visitor(record: NewVisitorRecord, data_dir, day=None) -> Path; append FinalizedSession/NewVisitorRecord as JSON lines under data/temporaryData/<day>/{sessions,visitors}.jsonl
src/storage/folder_rotator.py      — rotate_day(data_dir, day) -> Path | None; moves temporaryData/<day> into syncData/<day>, merging file-by-file into an existing partial syncData/<day> if one exists
src/storage/db_syncer.py           — sync_pending(session_factory, data_dir, pi_id) -> list[Path]; connectivity check (probes the DB itself, no separate network probe), reads visitors.jsonl/sessions.jsonl per day-folder under syncData/, upserts+inserts via repository.py, moves each successfully-synced day to processedData/; failures leave that day untouched in syncData/ for retry, other days still proceed
src/db/models.py                   — SQLAlchemy models: Visitor, Session (with (pi_id, started_at) index), SyncLog
src/db/connection.py               — async engine/session factory, connect_db() logs success or exits on failure
src/db/repository.py               — async DB ops for db_syncer/user_registry: get_known_faces(session, pi_id), upsert_visitor(session, visitor_id, pi_id, embedding, first_seen_at) -> bool (get-or-create), insert_sessions(session, pi_id, sessions), record_sync(session, pi_id, sync_date, rows_synced) (accumulates), get_total_watch_time_seconds, get_rows_synced
alembic/versions/0001_create_visitors_sessions_sync_log.py — initial migration, matches src/db/models.py exactly
src/main.py                        — resolve_pi_id(environment, configured_pi_id) (production -> getmac, else configured value); process_frame(frame, registry, tracker, data_dir, distance_threshold, now); flush_expired_sessions(tracker, data_dir, absence_timeout_seconds, now) -> list[FinalizedSession]; rotate_previous_day(data_dir, today) -> Path | None; run() wires all of it plus AsyncIOScheduler jobs for rotation/sync

## Environment Variables
ENVIRONMENT=local|production
PI_ANALYTICS_DATABASE_URL         — MySQL connection string (local/staging DB for dev, shared central DB in production)
PI_ID                             — Pi MAC address in production (auto-detected via getmac), fixed dev value locally
CAPTURE_INTERVAL_SECONDS
ABSENCE_TIMEOUT_SECONDS
FACE_MATCH_DISTANCE_THRESHOLD      — cosine distance (1 - cosine similarity) for InsightFace embeddings; default 0.5, confirmed target range 0.4-0.6, tune against real captures
DATA_DIR
ROTATION_CHECK_INTERVAL_SECONDS
SYNC_INTERVAL_SECONDS

## Validation commands
uv run mypy src
uv run pytest
uv run python -m src.main
