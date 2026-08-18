import cv2
import numpy as np


class CameraCaptureError(Exception):
    pass


class CameraCapture:
    def __init__(self, device_index: int = 0, frame_width: int | None = None, frame_height: int | None = None) -> None:
        self.device_index = device_index
        self.frame_width = frame_width
        self.frame_height = frame_height
        self._capture: cv2.VideoCapture | None = None

    def open(self) -> None:
        self._capture = cv2.VideoCapture(self.device_index)
        if not self._capture.isOpened():
            raise CameraCaptureError(f"Failed to open camera device {self.device_index}")

        if self.frame_width is not None:
            self._capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
        if self.frame_height is not None:
            self._capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_height)

    def read_frame(self) -> np.ndarray:
        if self._capture is None:
            raise CameraCaptureError("Camera is not open — call open() first")

        success, frame = self._capture.read()
        if not success:
            raise CameraCaptureError("Failed to read frame from camera")

        return frame

    def close(self) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None
