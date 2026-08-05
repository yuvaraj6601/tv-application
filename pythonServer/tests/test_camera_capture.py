import numpy as np
import pytest

from src.capture import camera_capture
from src.capture.camera_capture import CameraCapture, CameraCaptureError


class _FakeCvCapture:
    def __init__(self, opened: bool = True, read_success: bool = True) -> None:
        self._opened = opened
        self._read_success = read_success
        self.released = False

    def isOpened(self) -> bool:  # noqa: N802 - matches cv2.VideoCapture API
        return self._opened

    def read(self) -> tuple[bool, np.ndarray]:
        if not self._read_success:
            return False, np.array([])
        return True, np.zeros((5, 5, 3), dtype=np.uint8)

    def release(self) -> None:
        self.released = True


def test_happy_path_reads_frame_successfully(monkeypatch) -> None:
    fake_capture = _FakeCvCapture(opened=True, read_success=True)
    monkeypatch.setattr(camera_capture.cv2, "VideoCapture", lambda index: fake_capture)

    capture = CameraCapture(device_index=0)
    capture.open()
    frame = capture.read_frame()

    assert frame.shape == (5, 5, 3)
    capture.close()
    assert fake_capture.released is True


def test_failure_device_fails_to_open_raises_clear_error(monkeypatch) -> None:
    fake_capture = _FakeCvCapture(opened=False)
    monkeypatch.setattr(camera_capture.cv2, "VideoCapture", lambda index: fake_capture)

    capture = CameraCapture(device_index=0)

    with pytest.raises(CameraCaptureError, match="Failed to open camera device"):
        capture.open()


def test_failure_read_frame_before_open_raises_clear_error() -> None:
    capture = CameraCapture(device_index=0)

    with pytest.raises(CameraCaptureError, match="not open"):
        capture.read_frame()


def test_failure_frame_read_fails_raises_clear_error(monkeypatch) -> None:
    fake_capture = _FakeCvCapture(opened=True, read_success=False)
    monkeypatch.setattr(camera_capture.cv2, "VideoCapture", lambda index: fake_capture)

    capture = CameraCapture(device_index=0)
    capture.open()

    with pytest.raises(CameraCaptureError, match="Failed to read frame"):
        capture.read_frame()
