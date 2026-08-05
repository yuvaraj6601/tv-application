# pythonServer

Raspberry Pi people-analytics capture and sync service. See [../docs/PLAN.md](../docs/PLAN.md) for the full design (architecture, DB schema, folder lifecycle, build order).

## Run commands

```bash
uv sync                    # install dependencies
cp .env.example .env       # fill in PI_ANALYTICS_DATABASE_URL etc.
uv run python -m src.main  # run
uv run pytest              # test
uv run mypy src            # type check
```

## Local testing vs. production

- Local: `camera_capture.py` opens the developer machine's default webcam; `.env` points `PI_ANALYTICS_DATABASE_URL` at a local/staging MySQL DB and sets a fixed `PI_ID` (e.g. `local-dev-test`).
- Production (on a Pi): same code opens the Pi's attached camera; config/credentials come from the Python server's secrets manager for `ENVIRONMENT=production`, and `PI_ID` is auto-detected from the Pi's MAC address.
