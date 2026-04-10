import json
import os
from typing import List, Tuple

import cv2


def main() -> None:
    image_path = os.getenv("CALIBRATION_IMAGE", "")
    output_path = os.getenv("CALIBRATION_OUT", "calibration_points.json")
    if not image_path:
        raise SystemExit("Set CALIBRATION_IMAGE to the frame path.")

    image = cv2.imread(image_path)
    if image is None:
        raise SystemExit("Failed to load image.")

    points: List[Tuple[int, int]] = []
    instructions = [
        "Click TOP-LEFT pitch corner",
        "Click TOP-RIGHT pitch corner",
        "Click BOTTOM-RIGHT pitch corner",
        "Click BOTTOM-LEFT pitch corner",
    ]

    def on_click(event, x, y, _flags, _param):
        if event == cv2.EVENT_LBUTTONDOWN and len(points) < 4:
            points.append((x, y))
            print(f"Point {len(points)}: ({x}, {y})")

    cv2.namedWindow("Pitch Calibration")
    cv2.setMouseCallback("Pitch Calibration", on_click)

    while True:
        display = image.copy()
        for idx, (x, y) in enumerate(points):
            cv2.circle(display, (x, y), 6, (0, 255, 255), -1)
            cv2.putText(
                display,
                str(idx + 1),
                (x + 8, y - 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2,
            )
        if len(points) < 4:
            cv2.putText(
                display,
                instructions[len(points)],
                (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
            )
        else:
            cv2.putText(
                display,
                "Press S to save, R to reset, ESC to exit",
                (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

        cv2.imshow("Pitch Calibration", display)
        key = cv2.waitKey(20) & 0xFF
        if key == 27:  # ESC
            break
        if key in (ord("r"), ord("R")):
            points.clear()
        if key in (ord("s"), ord("S")) and len(points) == 4:
            with open(output_path, "w", encoding="utf-8") as handle:
                json.dump({"image_points": points}, handle)
            print(f"Saved calibration to {output_path}")
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
