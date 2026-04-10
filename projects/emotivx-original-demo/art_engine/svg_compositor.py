from typing import Any, Dict, List, Optional, Tuple

try:
    import cairosvg
except Exception:  # pragma: no cover
    cairosvg = None


def build_svg(
    width: int,
    height: int,
    player_positions: List[Tuple[float, float]],
    pass_lines: List[Tuple[float, float, float, float]],
) -> str:
    circles = "\n".join(
        f'<circle cx="{x}" cy="{y}" r="18" fill="#00E5FF" opacity="0.7" />'
        for x, y in player_positions
    )
    lines = "\n".join(
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#FFD166" stroke-width="6" stroke-linecap="round" />'
        for x1, y1, x2, y2 in pass_lines
    )

    return f"""
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">
  <rect width="100%" height="100%" fill="#0B0F1A" />
  {lines}
  {circles}
</svg>
"""


def render_svg_to_png(svg: str, output_path: str) -> None:
    if cairosvg is None:
        raise RuntimeError("cairosvg is required to render SVG.")
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=output_path)
