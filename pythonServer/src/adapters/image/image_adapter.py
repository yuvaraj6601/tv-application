import cv2
import numpy as np

BOX_COLOR_BGR = (0, 255, 0)
BOX_THICKNESS = 2


class SnapshotEncodeError(Exception):
    pass


def render_face_snapshot(frame: np.ndarray, bounding_box: tuple[int, int, int, int]) -> bytes:
    annotated = frame.copy()
    x1, y1, x2, y2 = bounding_box
    cv2.rectangle(annotated, (x1, y1), (x2, y2), BOX_COLOR_BGR, BOX_THICKNESS)

    success, encoded = cv2.imencode(".jpg", annotated)
    if not success:
        raise SnapshotEncodeError("Failed to encode face snapshot as JPEG")

    return encoded.tobytes()
