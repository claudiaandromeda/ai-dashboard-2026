from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

try:
    from segment_anything_2 import SamPredictor  # placeholder import
except Exception:  # pragma: no cover
    SamPredictor = None

from art_engine.types import PixelPoint, SegmentationResult


@dataclass
class SegmentConfig:
    model_path: Optional[str] = None
    device: str = "cuda"


class SegmentStylizer:
    def __init__(self, config: SegmentConfig) -> None:
        self.config = config
        self.predictor = None
        if SamPredictor is not None and config.model_path:
            self.predictor = SamPredictor(config.model_path, device=config.device)

    def segment_actor(
        self,
        image: Any,
        point: PixelPoint,
        actor_metadata: Optional[Dict[str, Any]] = None,
    ) -> SegmentationResult:
        if self.predictor is None:
            raise RuntimeError("SAM2 predictor not configured.")
        if np is None:
            raise RuntimeError("numpy is required for segmentation.")

        point_coords = np.array([[point.u, point.v]])
        point_labels = np.array([1])
        masks, scores, _ = self.predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            multimask_output=True,
        )

        best_idx = int(scores.argmax())
        best_mask = masks[best_idx]

        # Optional refinement: if multiple masks, check jersey color or ball proximity.
        # This can be extended with actor_metadata['jersey_color'].
        return SegmentationResult(mask=best_mask, score=float(scores[best_idx]))
