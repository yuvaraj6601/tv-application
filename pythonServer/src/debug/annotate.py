import cv2
import numpy as np

_BOX_COLOR = (0, 200, 0)
_LABEL_COLOR = (0, 200, 0)


def annotate_frame(frame: np.ndarray, detections: list[tuple[tuple[int, int, int, int], str]]) -> np.ndarray:
    annotated = frame.copy()
    for (x1, y1, x2, y2), visitor_id in detections:
        cv2.rectangle(annotated, (x1, y1), (x2, y2), _BOX_COLOR, 2)
        label = visitor_id[-6:]
        cv2.putText(annotated, label, (x1, max(y1 - 8, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, _LABEL_COLOR, 2)
    return annotated
