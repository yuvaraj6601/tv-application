import asyncio
import logging
from collections.abc import AsyncIterator

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from uvicorn import Config, Server

logger = logging.getLogger(__name__)

_MJPEG_BOUNDARY = "frame"
_STREAM_FPS = 5

_latest_jpeg: bytes | None = None
_lock = asyncio.Lock()


async def set_latest_frame(frame: np.ndarray) -> None:
    success, encoded = cv2.imencode(".jpg", frame)
    if not success:
        return
    global _latest_jpeg
    async with _lock:
        _latest_jpeg = encoded.tobytes()


async def _mjpeg_frames() -> AsyncIterator[bytes]:
    while True:
        async with _lock:
            jpeg = _latest_jpeg
        if jpeg is not None:
            yield (
                b"--" + _MJPEG_BOUNDARY.encode() + b"\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n\r\n" + jpeg + b"\r\n"
            )
        await asyncio.sleep(1 / _STREAM_FPS)


def create_app() -> FastAPI:
    app = FastAPI()

    @app.get("/stream.mjpg")
    async def stream() -> StreamingResponse:
        return StreamingResponse(
            _mjpeg_frames(), media_type=f"multipart/x-mixed-replace; boundary={_MJPEG_BOUNDARY}"
        )

    return app


async def start_debug_stream_server(host: str, port: int) -> asyncio.Task[None]:
    config = Config(app=create_app(), host=host, port=port, log_level="warning")
    server = Server(config)
    logger.warning("Debug camera stream (testing only) starting at http://%s:%s/stream.mjpg", host, port)
    return asyncio.create_task(server.serve())
