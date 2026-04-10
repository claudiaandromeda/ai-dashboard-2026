from dataclasses import dataclass
from typing import Any, List, Optional, Tuple

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

from art_engine.types import HomographyResult, PixelPoint


@dataclass
class PitchModel:
    width: float = 120.0
    height: float = 80.0

    def default_keypoints(self) -> List[Tuple[float, float]]:
        # Four corners of the pitch model in StatsBomb coords.
        return [(0.0, 0.0), (self.width, 0.0), (self.width, self.height), (0.0, self.height)]


class PixelPrecisionMapper:
    def __init__(self, pitch: Optional[PitchModel] = None) -> None:
        self.pitch = pitch or PitchModel()

    def estimate_homography(
        self,
        field_points: List[Tuple[float, float]],
        image_points: List[Tuple[float, float]],
    ) -> HomographyResult:
        if cv2 is None:
            raise RuntimeError("opencv-python is required for homography.")
        if len(field_points) < 4 or len(image_points) < 4:
            raise ValueError("At least 4 point pairs required for homography.")

        src = np.array(field_points, dtype=np.float32)
        dst = np.array(image_points, dtype=np.float32)
        H, mask = cv2.findHomography(src, dst, method=cv2.RANSAC)
        if H is None:
            raise RuntimeError("Homography could not be estimated.")
        return HomographyResult(H=H, inliers=mask)

    def map_point(self, H: Any, x: float, y: float) -> PixelPoint:
        point = np.array([[x, y]], dtype=np.float32)
        point = np.array([point])
        mapped = cv2.perspectiveTransform(point, H)[0][0]
        return PixelPoint(u=float(mapped[0]), v=float(mapped[1]))

    def map_actor(
        self,
        H: Any,
        statsbomb_xy: Tuple[float, float],
    ) -> PixelPoint:
        return self.map_point(H, statsbomb_xy[0], statsbomb_xy[1])

    def normalize_statsbomb_xy(self, x: float, y: float) -> Tuple[float, float]:
        # Scale StatsBomb coords to a 0-1 space if needed for other mappings.
        return x / self.pitch.width, y / self.pitch.height
