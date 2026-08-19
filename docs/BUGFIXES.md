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
