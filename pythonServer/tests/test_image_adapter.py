import cv2
import numpy as np

from src.adapters.image.image_adapter import render_face_snapshot

BOUNDING_BOX = (50, 30, 150, 80)
BACKGROUND = 40


def _blank_frame(height: int = 100, width: int = 200) -> np.ndarray:
    return np.full((height, width, 3), BACKGROUND, dtype=np.uint8)


def _decode(jpeg: bytes) -> np.ndarray:
    return cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)


def _has_green(pixels: np.ndarray) -> bool:
    flat = pixels.reshape(-1, 3).astype(int)
    blue, green, red = flat[:, 0], flat[:, 1], flat[:, 2]
    return bool(np.any((green > 180) & (red < 90) & (blue < 90)))


def test_happy_path_returns_decodable_jpeg_with_same_dimensions() -> None:
    frame = _blank_frame()

    jpeg = render_face_snapshot(frame, BOUNDING_BOX)

    assert jpeg[:2] == b"\xff\xd8"
    assert _decode(jpeg).shape == frame.shape


def test_happy_path_draws_green_box_on_top_and_left_edges_of_face() -> None:
    decoded = _decode(render_face_snapshot(_blank_frame(), BOUNDING_BOX))

    assert _has_green(decoded[28:33, 100])
    assert _has_green(decoded[55, 48:53])
    assert _has_green(decoded[78:83, 100])
    assert _has_green(decoded[55, 148:153])


def test_boundary_only_the_box_outline_is_drawn() -> None:
    decoded = _decode(render_face_snapshot(_blank_frame(), BOUNDING_BOX))

    inside = decoded[55, 100].astype(int)
    far_away = decoded[5, 5].astype(int)
    assert np.all(np.abs(inside - BACKGROUND) < 10)
    assert np.all(np.abs(far_away - BACKGROUND) < 10)


def test_conflict_input_frame_is_not_mutated() -> None:
    frame = _blank_frame()

    render_face_snapshot(frame, BOUNDING_BOX)

    assert np.all(frame == BACKGROUND)


def test_boundary_box_partly_outside_frame_still_returns_jpeg() -> None:
    frame = _blank_frame()

    jpeg = render_face_snapshot(frame, (-20, -10, 120, 60))

    assert _decode(jpeg).shape == frame.shape
