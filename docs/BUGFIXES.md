# Bugfix Log

Defect history for this project — kept separate from `docs/PLAN.md` (feature/build-order history)
so the two don't get mixed.

---

## Bugfix: FACE_MATCH_DISTANCE_THRESHOLD too strict for buffalo_l model — 2026-08-19

**Fixed at:** 2026-08-19
**Flow affected:** Switch face detection/recognition to InsightFace (`docs/PLAN.md`'s "Switch face detection/recognition to InsightFace" entry) — specifically the `buffalo_s`→`buffalo_l` model swap made earlier the same day.
**Issue:** Same physical visitor intermittently got a new `visitor_id` instead of being recognized as a returning visitor — not on every visit, only sometimes.
**Root cause:** `FACE_MATCH_DISTANCE_THRESHOLD=0.55` (`pythonServer/.env`, `pythonServer/.env.example`) was empirically tuned for the `buffalo_s` embedding model's cosine-distance distribution (2026-08-18 tuning history). Earlier the same day, the recognition model was swapped to `buffalo_l` (larger ResNet-based backbone vs. `buffalo_s`'s MobileFaceNet) without retuning the threshold. `buffalo_l` produces a different same-person distance distribution, so borderline shots (angle/lighting/distance variation) occasionally landed just above the old 0.55 cutoff in `pythonServer/src/recognition/face_matcher.py:27`, causing `match_face()` to return `None` and register a new visitor instead of matching the existing one — exactly the intermittent pattern reported.
**Fix:** Raised `FACE_MATCH_DISTANCE_THRESHOLD` from `0.55` to `0.6` to give more headroom against `buffalo_l`'s distance distribution. No code change — `match_face()`'s comparison logic (`distances[best_index] <= distance_threshold`) was already correct; this was purely a stale calibration value left over from the prior model. Value is still approximate and may need further empirical tuning, consistent with the project's prior threshold-tuning history.
**Files:** `pythonServer/.env`, `pythonServer/.env.example`, `pythonServer/CLAUDE.md`

---

## Bugfix: sessions synced with no matching visitor (DB foreign-key error blocks whole-day sync) — 2026-10-06 11:38

**Fixed at:** 2026-10-06 11:38
**Flow affected:** Capture → match/register → session-track → daily write → rotate → DB sync (`docs/PLAN.md` pythonServer people-analytics flow).
**Issue:** A day's folder in `data/syncData/` never uploaded to MySQL and was retried every sync interval without ever succeeding. On the Pi (`holobox`), three days were stuck (2026-08-20, 2026-08-24, 2026-10-05) with `IntegrityError 1452` on `sessions.visitor_id → visitors.id`, so the whole day rolled back, including its valid rows.
**Root cause:** `flush_expired_sessions` (`pythonServer/src/main.py`) correctly discards a zero-duration session and drops that visitor's pending `NewVisitorRecord` (so a single-frame glimpse writes nothing). But `UserRegistry.identify_or_register` had already added the face to its in-memory `_known_faces`. When the same person came back, `match_face` matched the unsaved entry and returned `(visitor_id, None)` — no new record — so their real session was written to `sessions.jsonl` with a `visitor_id` that existed in no `visitors.jsonl`. `_sync_day` then inserted a session referencing a non-existent visitor and MySQL rejected it.
**Fix:** Added `UserRegistry.forget(visitor_id)` and an optional `registry` argument to `flush_expired_sessions`; when a zero-duration session discards a pending new-visitor record, the registry forgets that visitor too (`run()` passes the registry in). A returning face now registers as a new visitor with a proper record written alongside its first real session. Known visitors loaded from the DB (no pending record) are unaffected. Zero-duration behaviour is unchanged: still no session and no visitor written. Existing orphaned data in `syncData/` was deliberately left untouched.
**Files:** `pythonServer/src/main.py`, `pythonServer/src/recognition/user_registry.py`, `pythonServer/tests/test_main.py`, `pythonServer/tests/test_user_registry.py`, `pythonServer/CLAUDE.md`, `docs/BUGFIXES.md`

---

## Bugfix: TV player freezes after a second video is uploaded — 2026-10-09 13:42

**Fixed at:** 2026-10-09 13:42
**Flow affected:** TV player content sync and playback (`mobileApplication/src/screens/player/player.screen.tsx`, `file.cache.utils.ts` cache swap).
**Issue:** On a TV running the release build, uploading a second video from the admin panel downloaded and started playing it, then playback got stuck. A fresh install (cache and state wiped) played both videos fine.
**Root cause:** Each sync deletes `active/` and moves `staging/` into it while the player may be reading from it, then `setPlaylist` resets `currentIndex` to 0. When item 0 keeps the same `id-order` path, `<Video>` gets an identical `source.uri` and is never remounted, so it stays attached to the replaced file (and `repeat` flips off once there are two items), so `onEnd` never fires. Compounding it: `resync()` returned early while a sync was running, silently dropping the `contentUpdated` for the upload; `<Video>` had no `onError`, so a failed decode froze the player; and sync failures were swallowed by `.catch(() => undefined)`.
**Fix:** Media elements are keyed by `id-order-syncVersion`, where the version is bumped after every successful sync, so the player remounts on the new files. `<Video onError>` logs and calls `moveNext`. An update arriving mid-sync sets a queued flag and triggers exactly one more sync once the current one finishes. Sync failures are logged through a new `logger` adapter. Not confirmed on-device with logcat; the diagnosis was confirmed by the failing reproduction tests.
**Files:** `mobileApplication/src/screens/player/player.screen.tsx`, `mobileApplication/src/adapters/logger/logger.adapter.ts`, `mobileApplication/__tests__/player.screen.test.tsx`, `mobileApplication/jest.config.js`, `mobileApplication/package.json`, `mobileApplication/package-lock.json`, `mobileApplication/CLAUDE.md`, `docs/BUGFIXES.md`
