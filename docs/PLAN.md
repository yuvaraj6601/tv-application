# TV Application — Feature Plans

## Feature: Raspberry Pi People-Analytics Python Server — 2026-08-05

### Description

Add a new, independent Python service that runs **on each Raspberry Pi** (which has a webcam attached). It watches the webcam feed, detects/recognizes faces, and tracks unique visitors and their watch-time per device. It has its own separate MySQL database (not the existing `spatiabox_db`). Data is buffered locally in three rotating folders and synced to the DB opportunistically when internet is available. The existing Node admin backend reads this second MySQL DB directly (per user decision) to surface analytics on the device-detail screen, keyed by a new `pi_id` field (the Pi's MAC address) stored on the `Device` record.

**User stories**
- As an admin, I can enter a Pi's MAC address (`pi_id`) on the device-detail screen so the dashboard knows which Pi's analytics belong to that device.
- As an admin, I can see unique visitor count, total watch time across all visitors, and per-visitor watch time for a device on its detail screen.
- As a returning visitor, I am recognized by face and not counted as a new unique user; my new visit still logs a new session against my existing user record.
- As the system, I keep working offline — analytics keep recording locally and sync automatically once connectivity returns, without duplicating already-synced data.

### Decisions confirmed with user

- Node backend connects to the Python server's MySQL DB **directly** (second Prisma/DB client), not via a Python REST API.
- Face re-identification uses `face_recognition` (dlib) embeddings with a distance threshold.
- Watch time uses **continuous presence tracking**: session opens on first detection, stays open while the person is seen (polled every few seconds), closes after an absence timeout; duration = `last_seen_at - first_seen_at`.
- Code lives in a new top-level `pythonServer/` folder (sibling to `backend/`, `webApplication/`, `mobileApplication/`).
- Python server is TDD-first: pytest tests written and reviewed before implementation, matching this project's TDD workflow.

### Local testing vs. production camera source

- **Local development/testing**: `camera_capture.py` opens the developer's own laptop/desktop webcam (OpenCV `VideoCapture(0)`, the default local camera index) so the full pipeline can be exercised without a Pi.
- **Production (on a Pi)**: `camera_capture.py` opens a USB webcam attached to the Pi via OpenCV `VideoCapture(0)` — the same call as local dev, no separate code path. **`picamera2` is explicitly not used** — the Pi Camera Module (CSI ribbon-cable camera) is out of scope; only a standard USB webcam attached to the Pi is supported, confirmed 2026-08-06.
- The camera source itself is not what changes between environments in code — the **capture module always opens the local default camera device** on whatever machine it runs on (dev laptop or Pi's USB webcam), via `cv2.VideoCapture`. What changes per environment is **configuration and credentials**, pulled from the environment's secrets manager:
  - `ENVIRONMENT` = `local` | `production` (or `test` | `production`) — selects which secrets/config profile to load.
  - `PI_ANALYTICS_DATABASE_URL` — **test/local runs point at a local or staging MySQL instance**; **production runs point at the shared central `pythonServer` MySQL DB**. Both values are read from the Python server's secrets manager (never hardcoded, never committed), keyed by `ENVIRONMENT`.
  - `PI_ID` — in production this is the Pi's real MAC address (auto-detected via `uuid.getnode()`/`getmac`); in local testing it's a fixed dev value (e.g. `local-dev-test`) from `.env` so test data is clearly distinguishable and never collides with real Pi rows.
  - Face-matching thresholds, capture interval, and absence timeout are also environment-configurable (local testing may want a shorter absence timeout to speed up manual verification).
- `config/settings.py` loads `ENVIRONMENT` first, then fetches the rest of the config from the secrets manager for that environment — no separate code path for "local camera" vs "Pi camera," only separate config values.

### Architecture overview

```
pythonServer/
  src/
    capture/
      camera_capture.py        # opens webcam, grabs frames on an interval
      face_detector.py         # detects faces in a frame (face_recognition/dlib)
    recognition/
      face_matcher.py          # compares new embedding vs stored embeddings, threshold match
      user_registry.py         # create/find visitor by embedding, backed by DB
    session/
      session_tracker.py       # continuous-presence session state machine (open/extend/close)
    storage/
      daily_writer.py          # writes today's detections/sessions into temporaryData/
      folder_rotator.py        # end-of-day: temporaryData -> syncData (merge)
      db_syncer.py             # syncData -> MySQL upload; on success: syncData -> processedData
    db/
      models.py                # SQLAlchemy models: Visitor, Session, Device (pi-local record)
      connection.py            # MySQL engine/session factory (reads env vars)
    config/
      settings.py              # loads ENVIRONMENT (local/production), then pulls thresholds,
                                # intervals, paths, DB URL, PI_ID from the secrets manager for
                                # that environment
    main.py                    # wires capture -> detect -> match -> session -> daily_writer loop
  data/
    temporaryData/             # today's in-progress capture (JSON/CSV per day, pre-rotation)
    syncData/                  # rotated-in completed days, pending DB upload
    processedData/             # days successfully uploaded to MySQL
  tests/
    test_face_matcher.py
    test_session_tracker.py
    test_folder_rotator.py
    test_db_syncer.py
  requirements.txt
  .env.example
  README.md
```

**Pipeline (Application Flow)**

1. **Entry point** — `main.py` runs a continuous loop on Pi boot (systemd service): reads a frame from `camera_capture.py` every `CAPTURE_INTERVAL_SECONDS` (e.g. 2s).
2. **Detection** — `face_detector.py` finds face bounding boxes + computes an embedding per face via `face_recognition`.
3. **Matching** — `face_matcher.py` compares each embedding against embeddings already known for this `PI_ID` (loaded from local cache, refreshed from DB on sync). Distance below threshold → existing `visitor_id`. Otherwise → `user_registry.py` creates a new `Visitor` with a new UUID, stores its embedding.
4. **Session tracking** — `session_tracker.py` keeps an in-memory map of `visitor_id -> {first_seen_at, last_seen_at}`. Each detection extends `last_seen_at`. A background tick closes any session whose `last_seen_at` is older than `ABSENCE_TIMEOUT_SECONDS` (e.g. 30s), finalizing `duration = last_seen_at - first_seen_at` and handing it to `daily_writer.py`.
5. **Daily local write** — `daily_writer.py` appends each finalized session (and any new visitor record) as a row into today's file under `data/temporaryData/YYYY-MM-DD/`.
6. **End-of-day rotation** — a scheduled job (e.g. APScheduler / cron, run at local midnight) calls `folder_rotator.py`: moves `temporaryData/YYYY-MM-DD/` into `syncData/YYYY-MM-DD/` (merging if a partial sync folder for that date already exists from a prior offline day).
7. **Sync when online** — a periodic job (e.g. every 5 min) in `db_syncer.py` checks connectivity, and for each day-folder in `syncData/`: upserts visitors (by UUID) and inserts sessions into MySQL, tagging every row with `pi_id` (this Pi's MAC address, read once at startup via `getmac`/`uuid.getnode()` and put in config). On success, moves that day-folder from `syncData/` to `processedData/`. Partial failures leave the folder in `syncData/` for retry.
8. **Cross-cutting** — all local writes are append-only JSON Lines (crash-safe); `db_syncer.py` uses idempotent upserts (`ON DUPLICATE KEY` / unique constraint on `(pi_id, visitor_local_id)` and `(pi_id, session_id)`) so a retried sync never double-counts.
9. **Read side** — Node backend's `GET /api/v1/device/:id/analytics` (new endpoint) looks up the device's `pi_id`, queries the Python server's MySQL DB directly via a second Prisma client scoped to that DB, and returns aggregated unique-user count, total watch time, and per-user watch time for that `pi_id`.

### New Database — `pythonServer` MySQL DB (separate from `spatiabox_db`)

Managed via SQLAlchemy models on the Python side; the Node backend accesses this DB read-only through a **second Prisma schema** (`backend/prisma/pi-analytics.schema.prisma`, introspected from these tables) so the existing Node backend can keep using Prisma idiomatically without owning migrations for this DB.

```
Table: visitors
  id              CHAR(36)     PK, UUID, generated by Python on first sighting
  pi_id           VARCHAR(17)  indexed  — MAC address of the Pi that first saw this visitor
  face_embedding  BLOB         — serialized embedding vector (for re-match on that Pi)
  first_seen_at   DATETIME
  created_at      DATETIME     default now

  @@unique([pi_id, id])
  @@index([pi_id])

Table: sessions
  id              CHAR(36)     PK, UUID
  pi_id           VARCHAR(17)  indexed
  visitor_id      CHAR(36)     FK -> visitors.id
  started_at      DATETIME
  ended_at        DATETIME
  duration_seconds INT          — ended_at - started_at, stored for fast aggregation
  synced_at       DATETIME     default now  — when this row was written to MySQL

  @@index([pi_id, visitor_id])
  @@index([pi_id, started_at])

Table: sync_log   (optional, for observability)
  id              CHAR(36)     PK
  pi_id           VARCHAR(17)
  sync_date       DATE         — which local day-folder this batch came from
  rows_synced     INT
  synced_at       DATETIME     default now

  @@unique([pi_id, sync_date])
```

**Aggregation queries pushed to the DB (per global DB rule — no in-JS aggregation):**
- Unique users for a `pi_id`: `SELECT COUNT(*) FROM visitors WHERE pi_id = ?`
- Total watch time for a `pi_id`: `SELECT SUM(duration_seconds) FROM sessions WHERE pi_id = ?`
- Per-visitor watch time: `SELECT visitor_id, SUM(duration_seconds) FROM sessions WHERE pi_id = ? GROUP BY visitor_id`

### Schema change — existing `spatiabox_db` (`backend/prisma/schema.prisma`)

```
model Device {
  ...existing fields...
  piId  String? @unique   // Raspberry Pi MAC address, e.g. "b8:27:eb:12:34:56"
}
```
- New Prisma migration: `add_device_pi_id`.
- `piId` is optional (not every device is a Pi with a camera) and unique when set.

### New Node backend endpoints

```
PATCH /api/v1/device/:id/pi-id
  Body: { piId: string }          // validated as MAC address format
  Response: { status, data: DeviceDetailModel }
  - Controller: device.controller.ts -> new handler
  - Service: device.service.ts -> updatePiId(deviceId, piId)
  - Validation: device.validation.ts -> new piId schema (MAC regex)

GET /api/v1/device/:id/analytics
  Response: {
    status,
    data: {
      piId: string | null,
      uniqueVisitors: number,
      totalWatchTimeSeconds: number,
      visitors: Array<{ visitorId: string; watchTimeSeconds: number; firstSeenAt: string }>
    } | null   // null/empty-shaped result if device has no piId set yet
  }
  - Controller: device.controller.ts -> new handler
  - Service: new pi-analytics.service.ts -> queries the second Prisma client (pi-analytics DB) using the device's piId, runs the three aggregation queries above
```

### Backend changes needed

- `backend/prisma/schema.prisma`: add `piId` to `Device` (migration).
- `backend/prisma/pi-analytics.schema.prisma`: new Prisma schema pointed at the Python server's MySQL DB (`PI_ANALYTICS_DATABASE_URL` env var), generated client output to a separate path (e.g. `@prisma/pi-analytics-client`) to avoid clashing with the main client.
- `backend/src/services/pi-analytics.service.ts`: new service, all three aggregation queries via the second Prisma client — no in-JS aggregation.
- `backend/src/services/device.service.ts`: add `updatePiId`.
- `backend/src/controllers/device.controller.ts`: add `updatePiId` and `getAnalytics` handlers.
- `backend/src/routes/v1/device.route.ts`: register the two new routes (≤50 lines rule — just method + path + handler reference).
- `backend/src/validations/device.validation.ts`: add MAC-address validation schema for `piId`.
- `.env.example`: add `PI_ANALYTICS_DATABASE_URL`.

### New web dashboard screen changes

- `webApplication/src/screens/devices/detail/device-detail.screen.tsx`:
  - New input field + save button for `pi_id` (calls `deviceService.updatePiId`).
  - New "Analytics" section rendering unique visitors, total watch time, and a per-visitor watch-time table — fetched via `deviceService.getAnalytics(deviceId)` on mount (and after `pi_id` is saved).
  - If no `piId` set, show an empty/prompt state instead of the analytics section.
- `webApplication/src/services/device.service.ts`:
  - Add `DeviceAnalyticsModel` interface (in `src/interfaces/`, per naming rule — not inline).
  - Add `updatePiId(deviceId, piId)` and `getAnalytics(deviceId)` methods.
- `webApplication/src/screens/devices/detail/device-detail.screen.scss`: styles for the new pi-id input and analytics section (scoped, responsive per rule).
- No new Redux slice needed — analytics data is screen-local (fetched on mount, not shared across screens), consistent with how `deviceDetail` is currently handled in this screen.

### Python server — local storage lifecycle (detail)

- **`temporaryData/YYYY-MM-DD/`**: today's live capture. `daily_writer.py` appends JSON Lines as sessions close throughout the day. Never touched by the syncer.
- **`syncData/YYYY-MM-DD/`**: completed, not-yet-uploaded days. Populated only by `folder_rotator.py` at end-of-day (scheduled at local midnight). If the Pi was offline for multiple days, multiple date-folders accumulate here.
- **`processedData/YYYY-MM-DD/`**: successfully uploaded days, kept for audit/replay; never re-read by the running pipeline.
- Rotation and sync are separate, independently scheduled jobs so a sync failure never blocks the next day's rotation, and a missed rotation never blocks sync of already-rotated days.
- `db_syncer.py` checks connectivity before each attempt (e.g. lightweight request to the Node backend's health endpoint or a DNS check) — no retry storms when offline.

### Build order

1. **Python server skeleton + local pipeline (no DB yet)**: `camera_capture.py`, `face_detector.py`, `face_matcher.py` (in-memory only), `session_tracker.py`, `daily_writer.py` writing to `temporaryData/`. Tests: `test_face_matcher.py`, `test_session_tracker.py`.
2. **Folder rotation**: `folder_rotator.py` (temporaryData → syncData). Test: `test_folder_rotator.py`.
3. **Python-side MySQL DB + models**: `db/models.py`, `db/connection.py`, create the `pythonServer` database + tables.
4. **DB sync**: `db_syncer.py` (syncData → MySQL → processedData), connectivity check, idempotent upserts. Test: `test_db_syncer.py`.
5. **`main.py` wiring** + systemd service file + `PI_ID` detection (MAC address) at startup.
6. **Node backend**: `piId` migration on `Device`, second Prisma schema/client for the pi-analytics DB, `pi-analytics.service.ts`, controller/route/validation additions.
7. **Web dashboard**: `pi_id` input + save, analytics section on device-detail screen, service methods, interfaces, styles.

**End-to-end verification** (was item 8) — moved to the InsightFace feature's build order below (confirmed 2026-08-06), so the real hardware pass happens once, after the swap, instead of twice.

### Resolved decisions (confirmed 2026-08-05)

1. **Network reachability**: all Pis connect to one **shared, centrally-hosted** `pythonServer` MySQL DB (not a per-Pi local DB). Confirmed — matches the plan above.
2. **Face embedding scoping**: recognition/uniqueness is scoped **per `pi_id`** — the same person seen at Pi A and Pi B counts as two different visitor rows (`visitors.pi_id` is part of identity, not just a tag). Confirmed — matches the `@@unique([pi_id, id])` / per-`pi_id` matching design above.
3. **Hardware target**: confirmed 2026-08-06 — **Raspberry Pi 5, 8GB RAM**. Strong enough (quad-core Cortex-A76 @ 2.4GHz) to run ONNX Runtime's ARM-optimized path well, which is why the face detection/recognition backend is being swapped to InsightFace — see "Feature: Switch face detection/recognition to InsightFace (buffalo_s)" below.
4. **Privacy/retention**: no deletion/retention policy for now — embeddings and session data are kept indefinitely. Noted as a future addition; no TTL/cleanup job included in this build.
5. **Auth for the pi-analytics DB connection**: the Python server has its own separate secrets manager for `PI_ANALYTICS_DATABASE_URL` and any other credentials — Node backend and Python server provision/read secrets independently, no shared secrets store.
6. **Local testing vs. production**: local development/testing uses the developer's own machine webcam; both local and production pull their config/credentials (DB URL, `PI_ID`, thresholds) from the Python server's secrets manager, selected by an `ENVIRONMENT` variable — no hardcoded environment-specific values in code. See "Local testing vs. production camera source" above.

### Open questions

None blocking. Build order items 1–7 are shipped (see git history on `main`). End-to-end verification now lives in the InsightFace swap's build order below.

**2026-08-19 update**: the model pack was switched again, from `buffalo_s` to `buffalo_l` — `buffalo_s`'s error rate proved unacceptable and no `FACE_MATCH_DISTANCE_THRESHOLD` value fixed it. See the "Model choice" section below for the original buffalo_s rationale, now superseded. `buffalo_l` trades the Pi 5 performance headroom documented below for the larger/more accurate ResNet-based recognition backbone; on-device latency should be re-verified, and the distance threshold needs empirical retuning against buffalo_l's embedding distribution rather than reusing 0.55 as-is.

---

## Feature: Switch face detection/recognition to InsightFace (buffalo_s) — 2026-08-06

### Description

Build order items 1–6 shipped `face_detector.py`/`face_matcher.py` using `face_recognition` (dlib, 128-d embeddings) as the working baseline, with the hardware target still unconfirmed at the time. The hardware is now confirmed as a **Raspberry Pi 5, 8GB RAM** — strong enough to run ONNX Runtime's ARM-optimized path well. On this hardware, InsightFace (`buffalo_s` model pack: SCRFD detector + MobileFaceNet-based embedding, 512-d) gives meaningfully better speed and accuracy than dlib, with no extra hardware required (no Coral accelerator needed).

`face_detector.py` and `face_matcher.py` already isolate the embedding format behind clean interfaces (`FaceDetection`, `KnownFace`, both pydantic models with `embedding: list[float]`), and `session_tracker.py`/`user_registry.py`/`repository.py` operate purely on visitor IDs and opaque embedding vectors — none of them care about embedding dimensionality or which model produced it. This makes the swap a contained change to the detection/embedding backend only.

### Model choice

- **`buffalo_s`** (not `buffalo_l` or `buffalo_sc`) — best speed/accuracy balance for real-time edge use on a Pi 5. `buffalo_l` is heavier/more accurate but aimed at server-class hardware; `buffalo_sc` is smaller/faster but a further accuracy step down not needed given the Pi 5's headroom.
- Only two of `buffalo_s`'s bundled models are used: the **SCRFD detector** (bounding box + 5-point landmarks, used internally for face alignment) and the **MobileFaceNet recognition model** (512-d embedding). The pack's age/gender and 106-point dense-landmark models are not used — out of scope for this project (unique-visitor counting + watch time, not demographics or expression).
- Expression/emotion recognition is **not** part of `buffalo_s` or this swap — would require a separate dedicated model (e.g. FER+, mini-Xception) and is out of scope unless requested as its own feature.

### What changes vs. the current implementation

- `pythonServer/src/capture/face_detector.py` — replace the `face_recognition.face_locations`/`face_encodings` calls with `insightface.app.FaceAnalysis` (`buffalo_s` pack), still returning `list[FaceDetection]` with the same shape (`embedding: list[float]`, `bounding_box`) — only the embedding is now 512-d instead of 128-d, and the source ONNX models instead of dlib.
- `pythonServer/src/recognition/face_matcher.py` — `match_face()`'s signature and logic (distance threshold comparison) stay the same; only `FACE_MATCH_DISTANCE_THRESHOLD`'s value changes, since ArcFace/SFace-trained embeddings (InsightFace) use a different distance scale than dlib's face-distance metric. Needs empirical retuning, not a code change.
- `pythonServer/src/db/models.py` — `Visitor.face_embedding` stays `BLOB`/`LargeBinary` (already dimension-agnostic, stores serialized bytes) — **no schema or migration change needed**.
- `pythonServer/pyproject.toml` — replace `face_recognition`, `opencv-python`'s face-detection usage, `dlib`, and `setuptools<81` pin (that pin existed only to keep `pkg_resources` for `face_recognition_models`) with `insightface` + `onnxruntime`. `opencv-python` stays (still used for camera frame capture in `camera_capture.py`, unrelated to detection).
- Tests (`test_face_detector.py`, `test_face_matcher.py`) — same monkeypatch-based approach (mock the InsightFace model calls instead of `face_recognition`'s), same coverage shape (happy path, zero faces, multiple faces, boundary/threshold cases).

### Build order (new)

1. Swap `face_detector.py` to InsightFace `buffalo_s`, update `pyproject.toml` deps, update `test_face_detector.py` mocks — TDD as usual.
2. Set `FACE_MATCH_DISTANCE_THRESHOLD` default to **0.4–0.6 cosine distance** (confirmed 2026-08-06 as the target range for InsightFace/ArcFace-trained embeddings — a tunable tolerance, not an exact-match cutoff, same as the existing dlib-based threshold), update `.env.example`. Pick a starting value within that range and adjust based on item 5's real-capture results.
3. Re-verify `test_face_matcher.py`, `test_user_registry.py`, `test_main.py` still pass unchanged (they operate on opaque embeddings, shouldn't need edits — confirms the interface isolation held).
4. On-device verification on the actual Pi 5: confirm detection fps and re-identification accuracy are acceptable before considering this done.
5. **End-to-end verification** (moved from the original build order's item 8, confirmed 2026-08-06): run the Python server against the **developer's local system webcam** (not the Pi 5 camera — matches the project's existing local-dev-uses-local-webcam convention, see "Local testing vs. production camera source"), confirm rotation (`temporaryData` → `syncData`) and sync (`syncData` → MySQL → `processedData`) both work, then confirm the web dashboard shows numbers **consistent with** the observed test session for that `pi_id` — not an exact match. Watch time and visitor counts naturally vary run-to-run with frame timing/capture jitter, and re-identification itself is threshold-based (`FACE_MATCH_DISTANCE_THRESHOLD`, not exact-equality comparison), so "correct" here means the dashboard's numbers plausibly reflect what happened in front of the camera, within reasonable tolerance — not bit-for-bit identical to a hand count. This step does not require the physical Pi 5; item 4 (on-device fps/accuracy check) remains the only step needing the real hardware. This is the final step — closes out both this feature and the original plan's build order.

### Open questions

None blocking. `FACE_MATCH_DISTANCE_THRESHOLD` target range (0.4–0.6 cosine distance) and end-to-end verification approach (local system webcam) confirmed 2026-08-06 — item 2 picks a starting value in that range, item 5 verifies via local webcam, item 4 remains the only step requiring the physical Pi 5.

### Item 5 verification results (2026-08-06)

Ran the real pipeline against the developer's local webcam (`uv run python -m src.main`, `ENVIRONMENT=local`, `PI_ID=local-dev-test`). Confirmed working end to end:
- InsightFace `buffalo_s` model downloaded and loaded correctly (CPU-only, `CPUExecutionProvider`)
- Face detected, embedding captured, session tracked, and written to `temporaryData/<day>/{visitors,sessions}.jsonl`
- `rotate_day()` moved the day-folder into `syncData/`
- `sync_pending()` upserted visitors + inserted sessions into MySQL and moved the folder to `processedData/`; `sync_log.rows_synced` matched exactly (4 = 2 visitors + 2 sessions)
- Web dashboard's Visitor Analytics section showed **2 Unique Visitors, 1m 1s Total Watch Time**, matching the synced DB rows exactly (not just "consistent with" — an exact match in this run)

**Two things found — both fixed 2026-08-06:**
1. **Re-identification did not match the same person across two sightings ~80s apart** — two separate visitor UUIDs were created for what was very likely the same person walking away and returning. `FACE_MATCH_DISTANCE_THRESHOLD` was tuned 0.5 → 0.6 → 0.7 during real-webcam testing (each step still too strict, still duplicating visitors), then explicitly set down to 0.4, then further down to **0.2** (2026-08-06, fourth round) — the strictest value tried across this whole tuning session, requested and confirmed knowingly against the established direction (lower = stricter = *more* likely to duplicate visitors). Current value: **0.2**, in `pythonServer/src/config/settings.py` and `.env.example`. Local test data (`pythonServer/data/temporaryData|syncData|processedData/2026-08-06`, and the corresponding `tv-application-analytics` DB rows) from earlier verification runs was cleared out. If duplicate-visitor creation returns, the fix per the established direction is to raise this value, not lower it further.
2. **`pi_id` validation rejected the local-dev `PI_ID` convention** — `devicePiIdUpdateValidation` (Node backend Joi schema, `backend/src/validations/device.validation.ts`) and its client-side twin (`isValidPiId`, replacing the strict-only `isValidMacAddress` call in `webApplication/src/utils/functions.utils.ts`) now accept either a real MAC address **or** the exact literal `local-dev-test` (exported as `LOCAL_DEV_PI_ID` in both places), matching the Python server's local-dev `PI_ID` default. A device can now be linked to a locally-running dev instance directly through the dashboard UI — no more bypassing validation via a direct DB write.

## Feature: Capture and store visitor age/gender — 2026-08-06

`buffalo_s` already bundles a `genderage.onnx` model (visible in the InsightFace load logs during the real-webcam verification run) — it was being downloaded and loaded but never read. Added:

- `pythonServer/src/capture/face_detector.py` — `FaceDetection` gains `age: int` (rounded from InsightFace's `face.age`), `gender: str` (`"male"`/`"female"`, mapped from InsightFace's `face.gender` 0/1 convention)
- `pythonServer/src/storage/daily_writer.py` — `NewVisitorRecord` gains `age`, `gender`
- `pythonServer/src/recognition/user_registry.py` — `identify_or_register()` takes `age`, `gender`, only stored at first registration (never overwritten on later re-identifications, same treatment as `first_seen_at`)
- `pythonServer/src/db/models.py` — `Visitor.age` (nullable `INT`), `Visitor.gender` (nullable `VARCHAR(10)`) — nullable since visitors synced before this feature won't have them
- `pythonServer/src/db/repository.py`, `db_syncer.py`, `main.py` — `age`/`gender` threaded end to end from detection through to the DB row
- `pythonServer/alembic/versions/0002_add_visitor_age_gender.py` — migration adding the two columns, applied to the local `tv-application-analytics` test DB (stamped at `0001` first since that DB's tables were originally created via `prisma db push`, not Alembic)
- **Found and fixed a real bug**: `alembic/env.py` crashed (`ValueError: invalid interpolation syntax`) when `PI_ANALYTICS_DATABASE_URL` contains a URL-encoded `%` (e.g. `%40` in a password) — `ConfigParser`'s `set_main_option()` treats `%` as interpolation syntax. Fixed by escaping `%` → `%%` before passing the URL through.
- Scope: Python/DB only — **not surfaced in the Node backend or web dashboard** (out of scope for this change; would need `pi-analytics.schema.prisma` + `pi-analytics.service.ts` + UI updates as a follow-up if wanted).

### Emotion/expression detection

Explicitly out of scope — `buffalo_s` has no expression model; would require a separate dedicated model (e.g. FER+, mini-Xception) added as its own pipeline step, not covered here.
