from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class FrameActor:
    x: float
    y: float
    teammate: bool
    keeper: bool
    actor_id: Optional[str] = None
    jersey_color: Optional[Tuple[int, int, int]] = None


@dataclass
class Frame360:
    event_uuid: str
    match_id: str
    visible_area: Optional[List[float]]
    freeze_frame: List[FrameActor]


@dataclass
class EventRow:
    event_id: str
    match_id: str
    player_name: Optional[str]
    team_name: Optional[str]
    location_x: Optional[float]
    location_y: Optional[float]


@dataclass
class PixelPoint:
    u: float
    v: float


@dataclass
class HomographyResult:
    H: Any
    inliers: Optional[Any] = None


@dataclass
class SegmentationResult:
    mask: Any
    score: Optional[float] = None


@dataclass
class StylizedOutput:
    mode: str
    image: Any
    metadata: Dict[str, Any]
