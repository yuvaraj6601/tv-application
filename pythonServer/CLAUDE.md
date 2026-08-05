@~/.claude/skills/python.md

# TV Application — pythonServer

## Stack
- Plain Python service (no HTTP API) — no FastAPI/routers
- DB: SQLAlchemy 2.0 (async) + shared central MySQL DB (`pythonServer` DB, separate from the Node backend's `spatiabox_db`)
- Runs on each Raspberry Pi; locally the same code runs against the developer's own webcam
- Package management: `uv` + `pyproject.toml` + `uv.lock`
- See [../docs/PLAN.md](../docs/PLAN.md) for full architecture, DB schema, and build order

## Architecture
capture -> detect -> match -> session-track -> daily write -> (rotate -> sync, later build order items)

## Source structure
src/
  capture/           camera_capture.py, face_detector.py
  recognition/        face_matcher.py, user_registry.py (pending)
  session/            session_tracker.py
  storage/            daily_writer.py, folder_rotator.py (pending), db_syncer.py (pending)
  db/                 models.py, connection.py
  config/             settings.py
  main.py             entry point

## Modules (add one line per module as features are built)
src/session/session_tracker.py     — SessionTracker: record_presence(visitor_id, at), close_expired_sessions(now, absence_timeout_seconds) -> list[FinalizedSession]; in-memory continuous-presence state machine
src/recognition/face_matcher.py    — match_face(embedding, known_faces, distance_threshold) -> visitor_id | None; KnownFace pydantic model
src/capture/face_detector.py       — detect_faces(frame) -> list[FaceDetection]; thin wrapper over face_recognition.face_locations/face_encodings
src/capture/camera_capture.py      — CameraCapture: open()/read_frame()/close() wrapping cv2.VideoCapture, raises CameraCaptureError on failure
src/storage/daily_writer.py        — write_session(session, data_dir, day=None) -> Path; appends a FinalizedSession as one JSON line under data/temporaryData/<day>/sessions.jsonl
src/db/models.py                   — SQLAlchemy models: Visitor, Session, SyncLog (not yet wired to the pipeline — build order item 3)
src/db/connection.py               — async engine/session factory, connect_db() logs success or exits on failure

## Environment Variables
ENVIRONMENT=local|production
PI_ANALYTICS_DATABASE_URL         — MySQL connection string (local/staging DB for dev, shared central DB in production)
PI_ID                             — Pi MAC address in production (auto-detected via getmac), fixed dev value locally
CAPTURE_INTERVAL_SECONDS
ABSENCE_TIMEOUT_SECONDS
FACE_MATCH_DISTANCE_THRESHOLD
DATA_DIR
ROTATION_CHECK_INTERVAL_SECONDS
SYNC_INTERVAL_SECONDS

## Validation commands
uv run mypy src
uv run pytest
uv run python -m src.main
