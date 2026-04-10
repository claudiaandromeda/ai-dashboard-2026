"""
Colour Palette Utilities — Art Engine v2.0

Centralised colour palette handling for background generators.
Converts frontend team colour selections (1-4 colours) into weighted
palette distributions with hardcoded percentage splits.
"""

from typing import List, Tuple


# Hardcoded percentage splits by number of colours selected
_COLOUR_SPLITS = {
    1: [100.0],
    2: [70.0, 30.0],
    3: [50.0, 30.0, 20.0],
    4: [40.0, 30.0, 20.0, 10.0],
}


def build_palette(colours: List[str], n_colours: int) -> List[Tuple[str, float]]:
    """
    Build a weighted colour palette from team colour selections.

    Args:
        colours:    List of hex colour strings (e.g., ['#DA291C', '#FFFFFF', ...])
        n_colours:  Number of colours actually selected by the user (1-4).
                    If fewer colours are in the list, we cycle/repeat as needed.

    Returns:
        List of (colour_hex, percentage) tuples.
        Example: [('#DA291C', 70.0), ('#FFFFFF', 30.0)]

    Raises:
        ValueError: If n_colours is not in range [1, 4].
    """
    if n_colours < 1 or n_colours > 4:
        raise ValueError(f"n_colours must be 1-4, got {n_colours}")

    if not colours:
        raise ValueError("colours list cannot be empty")

    splits = _COLOUR_SPLITS[n_colours]
    palette: List[Tuple[str, float]] = []

    for i in range(n_colours):
        # Cycle through colours if the list is shorter than n_colours
        colour = colours[i % len(colours)]
        percentage = splits[i]
        palette.append((colour, percentage))

    return palette
