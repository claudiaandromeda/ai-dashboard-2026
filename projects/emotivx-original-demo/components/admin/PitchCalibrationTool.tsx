"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Landmark = { id: string; label: string; field: Point };
type CalibrationPoint = {
  id: string;
  label: string;
  field: Point;
  image: Point;
};
type BoxSet = {
  id: string;
  type: keyof typeof BOX_TYPES;
  points: CalibrationPoint[];
  locked: boolean;
};
type CalibrationRow = {
  id: string;
  created_at: string;
  event_uuid: string | null;
  bucket: string;
  image_path: string;
  image_width: number | null;
  image_height: number | null;
  image_points: number[][];
  field_points?: number[][];
  point_labels?: string[];
  notes: string | null;
  signed_url: string | null;
};
type EventRow = {
  event_id: string;
  match_id: string;
  competition_name: string | null;
  team_name: string | null;
  player_name: string | null;
  event_type: string | null;
  minute: number | null;
  second: number | null;
  has_frame: boolean;
  opponent_name?: string | null;
  match_label?: string | null;
};
type DataLineRow = {
  event_id: string;
  minute: number | null;
  second: number | null;
  period: number | null;
  team_name: string | null;
  player_name: string | null;
  event_type: string | null;
};

const instructions = [
  "Select a landmark, then click it on the frame",
];

const LANDMARKS: Landmark[] = [
  {
    id: "goal_corner_far",
    label: "Goal-side corner (far touchline)",
    field: { x: 0, y: 0 },
  },
  {
    id: "goal_corner_near",
    label: "Goal-side corner (near touchline)",
    field: { x: 0, y: 80 },
  },
  {
    id: "goal_18_goal_line_far",
    label: "18-yard box meets goal line (far touchline)",
    field: { x: 0, y: 18 },
  },
  {
    id: "goal_18_goal_line_near",
    label: "18-yard box meets goal line (near touchline)",
    field: { x: 0, y: 62 },
  },
  {
    id: "goal_18_box_line_far",
    label: "18-yard box corner on box line (far touchline)",
    field: { x: 18, y: 18 },
  },
  {
    id: "goal_18_box_line_near",
    label: "18-yard box corner on box line (near touchline)",
    field: { x: 18, y: 62 },
  },
  {
    id: "goal_6_goal_line_far",
    label: "6-yard box meets goal line (far touchline)",
    field: { x: 0, y: 30 },
  },
  {
    id: "goal_6_goal_line_near",
    label: "6-yard box meets goal line (near touchline)",
    field: { x: 0, y: 50 },
  },
  {
    id: "goal_6_box_line_far",
    label: "6-yard box corner in front of goal (far touchline)",
    field: { x: 6, y: 30 },
  },
  {
    id: "goal_6_box_line_near",
    label: "6-yard box corner in front of goal (near touchline)",
    field: { x: 6, y: 50 },
  },
  {
    id: "goal_penalty_spot",
    label: "Penalty spot",
    field: { x: 12, y: 40 },
  },
  {
    id: "goal_d_intersection_far",
    label: "D meets 18-yard box (far touchline)",
    field: { x: 18, y: 30 },
  },
  {
    id: "goal_d_intersection_near",
    label: "D meets 18-yard box (near touchline)",
    field: { x: 18, y: 50 },
  },
  {
    id: "goal_post_far_top",
    label: "Goalpost (far) top",
    field: { x: 0, y: 36.34 },
  },
  {
    id: "goal_post_far_bottom",
    label: "Goalpost (far) bottom",
    field: { x: 0, y: 43.66 },
  },
  {
    id: "goal_post_near_top",
    label: "Goalpost (near) top",
    field: { x: 0, y: 36.34 },
  },
  {
    id: "goal_post_near_bottom",
    label: "Goalpost (near) bottom",
    field: { x: 0, y: 43.66 },
  },
];

const LANDMARK_GROUPS = {
  goalArea: {
    label: "Goal-area landmarks",
    ids: LANDMARKS.map((item) => item.id),
  },
};

const BOX_TYPES = {
  sixYard: {
    label: "6-yard box (goal-side)",
    corners: [
      { label: "6-yard box goal line (far)", field: { x: 0, y: 30 } },
      { label: "6-yard box goal line (near)", field: { x: 0, y: 50 } },
      { label: "6-yard box box line (near)", field: { x: 6, y: 50 } },
      { label: "6-yard box box line (far)", field: { x: 6, y: 30 } },
    ],
  },
  eighteenYard: {
    label: "18-yard box (goal-side)",
    corners: [
      { label: "18-yard box goal line (far)", field: { x: 0, y: 18 } },
      { label: "18-yard box goal line (near)", field: { x: 0, y: 62 } },
      { label: "18-yard box box line (near)", field: { x: 18, y: 62 } },
      { label: "18-yard box box line (far)", field: { x: 18, y: 18 } },
    ],
  },
  goalMouth: {
    label: "Goal",
    corners: [
      { label: "Goal far (goal line)", field: { x: 0, y: 36.34 } },
      { label: "Goal near (goal line)", field: { x: 0, y: 43.66 } },
      { label: "Goal near (1m depth)", field: { x: 1, y: 43.66 } },
      { label: "Goal far (1m depth)", field: { x: 1, y: 36.34 } },
    ],
  },
};

export default function PitchCalibrationTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pendingPointsRef = useRef<CalibrationPoint[] | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [urlInput, setUrlInput] = useState("");
  const [selectedLandmarkId, setSelectedLandmarkId] = useState(
    LANDMARKS[0]?.id ?? "",
  );
  const [landmarkGroup, setLandmarkGroup] = useState<keyof typeof LANDMARK_GROUPS>(
    "goalArea",
  );
  const [zoom, setZoom] = useState(1);
  const [overscan, setOverscan] = useState(180);
  const [calibrationMode, setCalibrationMode] = useState<"landmarks" | "box">(
    "landmarks",
  );
  const [boxType, setBoxType] = useState<keyof typeof BOX_TYPES>("sixYard");
  const [boxSets, setBoxSets] = useState<BoxSet[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [draggingCorner, setDraggingCorner] = useState<{
    boxId: string;
    cornerIndex: number;
  } | null>(null);
  const [draggingBox, setDraggingBox] = useState<{
    boxId: string;
    start: Point;
  } | null>(null);
  const [boxMessage, setBoxMessage] = useState<string | null>(null);
  const [boxOverlay, setBoxOverlay] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [eventUuid, setEventUuid] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [lastCalibrationId, setLastCalibrationId] = useState<string | null>(null);
  const [storageBucket, setStorageBucket] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationRow[]>([]);
  const [loadingCalibrations, setLoadingCalibrations] = useState(false);
  const [filters, setFilters] = useState({
    competition: "",
    team: "",
    player: "",
    eventType: "",
    matchId: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    competitions: [] as string[],
    teams: [] as string[],
    players: [] as string[],
    eventTypes: [] as string[],
    matches: [] as Array<{ id: string; label: string }>,
  });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [dataLine, setDataLine] = useState<DataLineRow[]>([]);
  const [loadingDataLine, setLoadingDataLine] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderPreview, setRenderPreview] = useState<string | null>(null);

  const allPoints = useMemo(
    () => [
      ...points,
      ...boxSets.flatMap((box) => box.points),
    ],
    [points, boxSets],
  );
  const validPoints = useMemo(
    () =>
      allPoints.filter(
        (point) =>
          Number.isFinite(point.image.x) &&
          Number.isFinite(point.image.y) &&
          !(point.image.x === -1 && point.image.y === -1),
      ),
    [allPoints],
  );

  const payload = useMemo(
    () => ({
      image_points: validPoints.map((point) => [point.image.x, point.image.y]),
      field_points: validPoints.map((point) => [point.field.x, point.field.y]),
      point_labels: validPoints.map((point) => point.label),
    }),
    [validPoints],
  );
  const jsonOutput = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageSize) return;

    canvas.width = imageSize.width + overscan * 2;
    canvas.height = imageSize.height + overscan * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, overscan, overscan);

    if (calibrationMode === "box") {
      boxSets.forEach((box) => {
        const corners = box.points.filter(
          (point) => point.image.x !== -1 && point.image.y !== -1,
        );
        if (corners.length === 4) {
          ctx.beginPath();
          ctx.strokeStyle =
            box.id === activeBoxId ? "rgba(56, 189, 248, 0.95)" : "rgba(255,255,255,0.4)";
          ctx.lineWidth = 2;
          corners.forEach((corner, index) => {
            const cx = corner.image.x + overscan;
            const cy = corner.image.y + overscan;
            if (index === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          });
          ctx.closePath();
          ctx.stroke();
        }

        box.points.forEach((corner) => {
          if (corner.image.x === -1 || corner.image.y === -1) return;
          const cx = corner.image.x + overscan;
          const cy = corner.image.y + overscan;
          ctx.beginPath();
          ctx.arc(cx, cy, box.id === activeBoxId ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle =
            box.id === activeBoxId ? "rgba(16, 185, 129, 0.9)" : "rgba(255,255,255,0.6)";
          ctx.fill();
          ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
    }

    validPoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.image.x + overscan, point.image.y + overscan, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.fillText(
        String(index + 1),
        point.image.x + overscan + 10,
        point.image.y + overscan - 10,
      );
    });
  }, [imageSize, validPoints, overscan, calibrationMode, boxSets, activeBoxId]);

  const filteredLandmarks = useMemo(() => {
    const ids = LANDMARK_GROUPS[landmarkGroup]?.ids ?? LANDMARKS.map((l) => l.id);
    return LANDMARKS.filter((item) => ids.includes(item.id));
  }, [landmarkGroup]);

  const activeBox = useMemo(
    () => boxSets.find((box) => box.id === activeBoxId) ?? null,
    [boxSets, activeBoxId],
  );

  useEffect(() => {
    if (
      !activeBox ||
      !canvasRef.current ||
      !canvasWrapperRef.current ||
      !imageSize ||
      calibrationMode !== "box"
    ) {
      setBoxOverlay(null);
      return;
    }
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    const rect = canvas.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const xs = activeBox.points.map((point) => point.image.x);
    const ys = activeBox.points.map((point) => point.image.y);
    if (xs.length === 0 || ys.length === 0) {
      setBoxOverlay(null);
      return;
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const left =
      (minX + overscan) * scaleX + (rect.left - wrapperRect.left) + 12;
    const top =
      (minY + overscan) * scaleY + (rect.top - wrapperRect.top) - 52;
    setBoxOverlay({ left: Math.max(0, left), top: Math.max(0, top) });
  }, [activeBox, overscan, imageSize, calibrationMode, zoom]);

  useEffect(() => {
    if (!filteredLandmarks.find((item) => item.id === selectedLandmarkId)) {
      setSelectedLandmarkId(filteredLandmarks[0]?.id ?? "");
    }
  }, [filteredLandmarks, selectedLandmarkId]);

  useEffect(() => {
    setBoxMessage(null);
  }, [boxType]);

  const canvasToImage = useCallback(
    (canvasX: number, canvasY: number) => ({
      x: Math.round(canvasX - overscan),
      y: Math.round(canvasY - overscan),
    }),
    [overscan],
  );

  const buildBoxPoints = useCallback(
    (baseX: number, baseY: number, type: keyof typeof BOX_TYPES) => {
      if (!imageSize) return [];
      const config = BOX_TYPES[type];
      const imageWidth = imageSize.width;
      const imageHeight = imageSize.height;
      const widthRatio =
        type === "eighteenYard"
          ? 0.15
          : type === "sixYard"
          ? 0.05
          : type === "goalMouth"
          ? 0.2
          : 0.02;
      const heightRatio =
        type === "eighteenYard"
          ? 0.55
          : type === "sixYard"
          ? 0.25
          : type === "goalMouth"
          ? 0.08
          : 0.1;
      const widthPx = imageWidth * widthRatio;
      const heightPx = imageHeight * heightRatio;
      return config.corners.map((corner, index) => ({
        id: `${type}-${Date.now()}-${index}`,
        label: corner.label,
        field: corner.field,
        image: {
          x: index === 0 || index === 1 ? baseX : baseX + widthPx,
          y: index === 0 || index === 3 ? baseY : baseY + heightPx,
        },
      }));
    },
    [imageSize],
  );

  const handleResetActiveBox = useCallback(() => {
    if (!activeBox || !imageSize) return;
    const xs = activeBox.points.map((point) => point.image.x);
    const ys = activeBox.points.map((point) => point.image.y);
    const baseX = Math.min(...xs);
    const baseY = Math.min(...ys);
    const newPoints = buildBoxPoints(baseX, baseY, activeBox.type);
    setBoxSets((prev) =>
      prev.map((box) =>
        box.id === activeBox.id ? { ...box, points: newPoints, locked: false } : box,
      ),
    );
  }, [activeBox, imageSize, buildBoxPoints]);

  const hitTestCorner = useCallback(
    (canvasX: number, canvasY: number) => {
      let closest: { boxId: string; cornerIndex: number } | null = null;
      let minDist = 99999;
      boxSets.forEach((box) => {
        if (box.locked) return;
        box.points.forEach((point, index) => {
          if (point.image.x === -1 || point.image.y === -1) return;
          const px = point.image.x + overscan;
          const py = point.image.y + overscan;
          const dist = Math.hypot(canvasX - px, canvasY - py);
          if (dist < minDist) {
            minDist = dist;
            closest = { boxId: box.id, cornerIndex: index };
          }
        });
      });
      return minDist <= 12 ? closest : null;
    },
    [boxSets, overscan],
  );

  const hitTestBox = useCallback(
    (canvasX: number, canvasY: number) => {
      for (const box of boxSets) {
        const valid = box.points.filter(
          (point) => point.image.x !== -1 && point.image.y !== -1,
        );
        if (valid.length !== 4) continue;
        const xs = valid.map((p) => p.image.x + overscan);
        const ys = valid.map((p) => p.image.y + overscan);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        if (canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY) {
          return box.id;
        }
      }
      return null;
    },
    [boxSets, overscan],
  );

  const loadImage = useCallback(
    (url: string, nextPoints?: CalibrationPoint[] | null) => {
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageError(null);
      setPoints(nextPoints ?? []);
    };
    img.onerror = () => {
      setImageError("Failed to load image. Check the URL or file path.");
      setImageSize(null);
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (imageUrl) {
      const nextPoints = pendingPointsRef.current;
      loadImage(imageUrl, nextPoints ?? undefined);
      pendingPointsRef.current = null;
    }
  }, [imageUrl, loadImage]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return;
      if (!imageSize) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const rawX = (event.clientX - rect.left) * scaleX;
      const rawY = (event.clientY - rect.top) * scaleY;
      const { x, y } = canvasToImage(rawX, rawY);

      if (calibrationMode === "box") {
        const hit = hitTestCorner(rawX, rawY);
        if (hit) {
          setDraggingCorner(hit);
          setActiveBoxId(hit.boxId);
          setBoxMessage(null);
          return;
        }
        const hitBox = hitTestBox(rawX, rawY);
        if (hitBox) {
          const target = boxSets.find((box) => box.id === hitBox);
          setActiveBoxId(hitBox);
          if (target && !target.locked) {
            setDraggingBox({ boxId: hitBox, start: { x, y } });
          }
          setBoxMessage(null);
          return;
        }

        const newPoints = buildBoxPoints(x, y, boxType);
        const existing = boxSets.find((box) => box.type === boxType);
        if (existing?.locked) {
          setBoxMessage(
            `${BOX_TYPES[boxType].label} already confirmed. Delete it to redraw.`
          );
          setActiveBoxId(existing.id);
          return;
        }
        if (existing) {
          setBoxSets((prev) =>
            prev.map((box) =>
              box.id === existing.id
                ? { ...box, points: newPoints, locked: false }
                : box
            )
          );
          setActiveBoxId(existing.id);
        } else {
          const newBoxId = `box-${Date.now()}`;
          setBoxSets((prev) => [
            ...prev,
            { id: newBoxId, type: boxType, points: newPoints, locked: false },
          ]);
          setActiveBoxId(newBoxId);
        }
        setBoxMessage(null);
        return;
      }

      if (!selectedLandmarkId) return;
      const landmark = LANDMARKS.find((item) => item.id === selectedLandmarkId);
      if (!landmark) return;

      setPoints((prev) => [
        ...prev.filter((point) => point.id !== landmark.id),
        {
          id: landmark.id,
          label: landmark.label,
          field: landmark.field,
          image: { x, y },
        },
      ]);
    },
    [
      imageSize,
      selectedLandmarkId,
      calibrationMode,
      boxType,
      buildBoxPoints,
      canvasToImage,
      hitTestCorner,
      hitTestBox,
    ],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setObjectUrl(url);
      setImageUrl(url);
      setUrlInput("");
      pendingPointsRef.current = null;
      setStorageBucket(null);
      setStoragePath(null);
      setUploadStatus(null);
      setSaveStatus(null);
    },
    [objectUrl],
  );

  const handleUrlLoad = useCallback(() => {
    if (!urlInput.trim()) return;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setImageUrl(urlInput.trim());
    pendingPointsRef.current = null;
    setSelectedFile(null);
    setStorageBucket(null);
    setStoragePath(null);
    setUploadStatus(null);
    setSaveStatus(null);
  }, [objectUrl, urlInput]);

  const handleReset = useCallback(() => {
    setPoints([]);
    setBoxSets([]);
    setActiveBoxId(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (calibrationMode === "box") {
      if (activeBoxId) {
        setBoxSets((prev) =>
          prev.filter((box) => box.id !== activeBoxId || box.locked)
        );
        setActiveBoxId(null);
      }
      return;
    }
    setPoints((prev) => prev.slice(0, -1));
  }, [calibrationMode, activeBoxId]);

  const updateBoxPoint = useCallback(
    (index: number, axis: "x" | "y", value: number) => {
      setBoxSets((prev) =>
        prev.map((box) =>
          box.id !== activeBoxId
            ? box
            : box.locked
              ? box
              : {
                  ...box,
                  points: box.points.map((point, pointIndex) =>
                    pointIndex === index
                      ? {
                          ...point,
                          image: {
                            x: axis === "x" ? value : point.image.x,
                            y: axis === "y" ? value : point.image.y,
                          },
                        }
                      : point
                  ),
                }
        )
      );
    },
    [activeBoxId],
  );

  const handleCopyArtCommand = useCallback(async () => {
    if (!eventUuid) return;
    const envLines = [
      `EVENT_UUID="${eventUuid}"`,
      lastCalibrationId ? `CALIBRATION_ID="${lastCalibrationId}"` : "",
      "python scripts/precision_art_engine.py",
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(envLines);
  }, [eventUuid, lastCalibrationId]);

  const handleRenderPreview = useCallback(async () => {
    if (!eventUuid || !lastCalibrationId) {
      setRenderStatus("Select an event and save calibration first.");
      return;
    }
    setRenderStatus("Rendering preview...");
    setRenderPreview(null);
    try {
      const response = await fetch("/api/admin/art/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_uuid: eventUuid,
          calibration_id: lastCalibrationId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to render preview.");
      }
      setRenderPreview(result.image_base64);
      setRenderStatus("Preview generated.");
    } catch (error) {
      setRenderStatus(
        error instanceof Error ? error.message : "Failed to render preview.",
      );
    }
  }, [eventUuid, lastCalibrationId]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(jsonOutput);
  }, [jsonOutput]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "calibration_points.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [jsonOutput]);

  const refreshCalibrations = useCallback(async () => {
    setLoadingCalibrations(true);
    try {
      const response = await fetch("/api/admin/calibration/list", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to load calibrations.");
      }
      setCalibrations(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCalibrations(false);
    }
  }, []);

  useEffect(() => {
    refreshCalibrations();
  }, [refreshCalibrations]);

  const refreshFilters = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.competition) params.set("competition", filters.competition);
    if (filters.team) params.set("team", filters.team);
    if (filters.player) params.set("player", filters.player);
    if (filters.eventType) params.set("event_type", filters.eventType);
    if (filters.matchId) params.set("match_id", filters.matchId);

    const response = await fetch(`/api/admin/calibration/filters?${params}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (response.ok) {
        setFilterOptions({
          competitions: result.competitions ?? [],
          teams: result.teams ?? [],
          players: result.players ?? [],
          eventTypes: result.event_types ?? [],
          matches: result.matches ?? [],
        });
    }
  }, [filters]);

  const refreshEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams();
      if (filters.competition) params.set("competition", filters.competition);
      if (filters.team) params.set("team", filters.team);
      if (filters.player) params.set("player", filters.player);
      if (filters.eventType) params.set("event_type", filters.eventType);
      if (filters.matchId) params.set("match_id", filters.matchId);
      params.set("limit", "50");

      const response = await fetch(`/api/admin/calibration/events?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) {
        const nextEvents = Array.isArray(result.data) ? result.data : [];
        const sorted = nextEvents
          .map((row, index) => ({ row, index }))
          .sort((a, b) => {
            const aName = (a.row.player_name ?? "").trim().toLowerCase();
            const bName = (b.row.player_name ?? "").trim().toLowerCase();
            const aUnknown = !aName || aName === "unknown player";
            const bUnknown = !bName || bName === "unknown player";
            if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
            return a.index - b.index;
          })
          .map((item) => item.row);
        setEvents(sorted);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEvents(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshFilters();
    refreshEvents();
  }, [refreshEvents, refreshFilters]);

  useEffect(() => {
    if (!eventUuid) {
      setDataLine([]);
      return;
    }
    const load = async () => {
      setLoadingDataLine(true);
      try {
        const response = await fetch(
          `/api/admin/calibration/dataline?event_uuid=${eventUuid}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (response.ok) {
          setDataLine(result.data ?? []);
        }
      } finally {
        setLoadingDataLine(false);
      }
    };
    load();
  }, [eventUuid]);

  const updateFilter = useCallback(
    (key: keyof typeof filters, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const handleUploadToSupabase = useCallback(async () => {
    if (!selectedFile) {
      setUploadStatus("Select a file before uploading.");
      return;
    }
    setUploadStatus("Uploading to Supabase...");
    setSaveStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (eventUuid.trim()) {
        formData.append("event_uuid", eventUuid.trim());
      }
      const response = await fetch("/api/admin/calibration/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Upload failed.");
      }
      setStorageBucket(result.bucket);
      setStoragePath(result.path);
      if (result.signed_url) {
        setImageUrl(result.signed_url);
      }
      setUploadStatus("Uploaded. You can now save the calibration.");
    } catch (error) {
      setUploadStatus(
        error instanceof Error ? error.message : "Failed to upload image.",
      );
    }
  }, [eventUuid, selectedFile]);

  const handleSaveCalibration = useCallback(async () => {
    if (validPoints.length < 4) {
      setSaveStatus("Select at least four points before saving.");
      return;
    }
    if (!storagePath) {
      setSaveStatus("Upload the image to Supabase before saving.");
      return;
    }
    setSaveStatus("Saving calibration...");
    try {
      const response = await fetch("/api/admin/calibration/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_uuid: eventUuid.trim() || null,
          bucket: storageBucket ?? "calibration-frames",
          image_path: storagePath,
          image_width: imageSize?.width ?? null,
          image_height: imageSize?.height ?? null,
          image_points: payload.image_points,
          field_points: payload.field_points,
          point_labels: payload.point_labels,
          notes: notes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to save calibration.");
      }
      const savedId = result.data?.id ?? null;
      setLastCalibrationId(savedId);
      setSaveStatus(`Saved calibration ${savedId ?? ""}`.trim());
      refreshCalibrations();
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? error.message : "Failed to save calibration.",
      );
    }
  }, [
    eventUuid,
    imageSize,
    notes,
    payload.image_points,
    validPoints.length,
    refreshCalibrations,
    storageBucket,
    storagePath,
  ]);

  const handleLoadCalibration = useCallback((row: CalibrationRow) => {
    const imagePoints = row.image_points || [];
    const fieldPoints = row.field_points || [];
    const labels = row.point_labels || [];
    const fallbackCorners: Landmark[] = [
      { id: "left_corner_top", label: "Left corner (top touchline)", field: { x: 0, y: 0 } },
      { id: "right_corner_top", label: "Right corner (top touchline)", field: { x: 120, y: 0 } },
      { id: "right_corner_bottom", label: "Right corner (bottom touchline)", field: { x: 120, y: 80 } },
      { id: "left_corner_bottom", label: "Left corner (bottom touchline)", field: { x: 0, y: 80 } },
    ];

    const nextPoints: CalibrationPoint[] = imagePoints.map((coords, index) => {
      const [x, y] = coords || [];
      const fieldCoords = fieldPoints[index] || [
        fallbackCorners[index]?.field.x,
        fallbackCorners[index]?.field.y,
      ];
      const label =
        labels[index] ||
        fallbackCorners[index]?.label ||
        `Point ${index + 1}`;
      const landmarkId = fallbackCorners[index]?.id || `point-${index}`;
      return {
        id: landmarkId,
        label,
        field: { x: Number(fieldCoords?.[0] ?? 0), y: Number(fieldCoords?.[1] ?? 0) },
        image: { x: Math.round(x ?? 0), y: Math.round(y ?? 0) },
      };
    });
    setEventUuid(row.event_uuid || "");
    setNotes(row.notes || "");
    setStorageBucket(row.bucket);
    setStoragePath(row.image_path);
    setUploadStatus(null);
    setSaveStatus(null);
    setLastCalibrationId(row.id);
    if (row.signed_url) {
      pendingPointsRef.current = nextPoints;
      setImageUrl(row.signed_url);
    } else {
      setImageError("Missing signed URL for this calibration.");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Create Your Moment</h2>
        <p className="mt-2 text-sm text-white/60">
          Filter by Competition, Team, Player, Event and/or Match to find your
          moment, or enter the moment ID below.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <select
            value={filters.competition}
            onChange={(event) => updateFilter("competition", event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Competition</option>
            {filterOptions.competitions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.team}
            onChange={(event) => updateFilter("team", event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Team</option>
            {filterOptions.teams.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.player}
            onChange={(event) => updateFilter("player", event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Player</option>
            {filterOptions.players.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.eventType}
            onChange={(event) => updateFilter("eventType", event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Event type</option>
            {filterOptions.eventTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.matchId}
            onChange={(event) => updateFilter("matchId", event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Match</option>
            {filterOptions.matches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40">
          {loadingEvents ? (
            <p className="p-4 text-sm text-white/60">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="p-4 text-sm text-white/60">
              No events match those filters.
            </p>
          ) : (
            <div className="max-h-64 overflow-auto p-3">
              <div className="space-y-2">
                {events.map((row) => (
                  <button
                    key={row.event_id}
                    onClick={() => setEventUuid(row.event_id)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                  >
                    <div>
                      <div className="font-semibold">
                        {row.player_name || "Unknown player"} ·{" "}
                        {row.event_type || "Event"}
                      </div>
                      <div className="text-xs text-white/50">
                        {row.competition_name || "Competition"} ·{" "}
                        {row.match_label || row.match_id} · {row.minute ?? "-"}:
                        {String(row.second ?? "-").padStart(2, "0")}
                        {row.opponent_name ? ` · vs ${row.opponent_name}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-amber-400/40 px-2 py-1 text-xs text-amber-200">
                        Select moment
                      </span>
                      <span
                        className={
                          row.has_frame
                            ? "rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-200"
                            : "rounded-full bg-white/10 px-2 py-1 text-xs text-white/50"
                        }
                      >
                        {row.has_frame ? "360 frame" : "no 360"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Load a frame</h2>
        <p className="mt-2 text-sm text-white/60">
          Pick a broadcast frame image, then choose landmarks and click them on the frame.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="Paste an image URL"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleUrlLoad}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Load URL
          </button>
        </div>
        <div className="mt-4">
          <label className="text-sm text-white/60">Or upload a file</label>
          <div className="mt-2">
            <label
              htmlFor="calibration-file"
              className="inline-flex cursor-pointer items-center rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Choose file
            </label>
            <input
              id="calibration-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
          {selectedFile ? (
            <p className="mt-2 text-xs text-white/60">{selectedFile.name}</p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-white/60">Event UUID (optional)</label>
            <input
              type="text"
              value={eventUuid}
              onChange={(event) => setEventUuid(event.target.value)}
              placeholder="Event UUID"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Broadcast source or context"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleUploadToSupabase}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Store this data for later use
          </button>
          {storagePath ? (
            <span className="text-xs text-white/60">Saved at {storagePath}</span>
          ) : null}
          {uploadStatus ? (
            <span className="text-xs text-white/70">{uploadStatus}</span>
          ) : null}
        </div>
        {imageError ? (
          <p className="mt-3 text-sm text-red-300">{imageError}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Calibration canvas</h2>
            <p className="mt-2 text-sm text-white/60">
              {validPoints.length < 4
                ? instructions[0]
                : "Calibration ready. Download or copy the JSON."}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Pitch coordinates assume 120x80 with top touchline = y=0.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/80"
            >
              Reset points
            </button>
            <button
              onClick={handleUndo}
              disabled={validPoints.length === 0}
              className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
            >
              Undo last
            </button>
            <button
              onClick={handleSaveCalibration}
              disabled={validPoints.length < 4 || !storagePath}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              Save this calibration for this moment
            </button>
            <button
              onClick={handleCopy}
              disabled={validPoints.length < 4}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              Copy data
            </button>
            <button
              onClick={handleDownload}
              disabled={validPoints.length < 4}
              className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              Download previous calibration
            </button>
          </div>
        </div>
        {saveStatus ? (
          <p className="mt-3 text-sm text-white/70">{saveStatus}</p>
        ) : null}
        {lastCalibrationId && eventUuid ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span>Calibration ID: {lastCalibrationId}</span>
            <button
              onClick={handleCopyArtCommand}
              className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/70"
            >
              Copy art engine command
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalibrationMode("landmarks")}
              className={`rounded-xl border px-3 py-2 text-sm ${
                calibrationMode === "landmarks"
                  ? "border-amber-400/60 text-amber-200"
                  : "border-white/20 text-white/70"
              }`}
            >
              Landmarks
            </button>
            <button
              onClick={() => setCalibrationMode("box")}
              className={`rounded-xl border px-3 py-2 text-sm ${
                calibrationMode === "box"
                  ? "border-amber-400/60 text-amber-200"
                  : "border-white/20 text-white/70"
              }`}
            >
              Perspective box
            </button>
          </div>
          {calibrationMode === "box" ? (
            <select
              value={boxType}
              onChange={(event) =>
                setBoxType(event.target.value as keyof typeof BOX_TYPES)
              }
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {Object.entries(BOX_TYPES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {calibrationMode === "landmarks" ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <select
              value={landmarkGroup}
              onChange={(event) =>
                setLandmarkGroup(
                  event.target.value as keyof typeof LANDMARK_GROUPS
                )
              }
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {Object.entries(LANDMARK_GROUPS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <select
              value={selectedLandmarkId}
              onChange={(event) => setSelectedLandmarkId(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {filteredLandmarks.map((landmark) => (
                <option key={landmark.id} value={landmark.id}>
                  {landmark.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/60">
            Click corners in order to outline the selected box. You can also type
            coordinates below (off-image allowed).
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {imageSize ? (
            <div className="max-h-[70vh] overflow-auto">
              <div ref={canvasWrapperRef} className="relative inline-block">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasClick}
                  onMouseMove={(event) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    const rawX = (event.clientX - rect.left) * scaleX;
                    const rawY = (event.clientY - rect.top) * scaleY;
                    const coords = canvasToImage(rawX, rawY);
                    if (calibrationMode === "box" && draggingCorner) {
                      setBoxSets((prev) =>
                        prev.map((box) =>
                          box.id !== draggingCorner.boxId || box.locked
                            ? box
                            : {
                                ...box,
                                points: box.points.map((point, index) =>
                                  index === draggingCorner.cornerIndex
                                    ? { ...point, image: coords }
                                    : point
                                ),
                              }
                        )
                      );
                    }
                    if (calibrationMode === "box" && draggingBox) {
                      const deltaX = coords.x - draggingBox.start.x;
                      const deltaY = coords.y - draggingBox.start.y;
                      setBoxSets((prev) =>
                        prev.map((box) =>
                          box.id !== draggingBox.boxId || box.locked
                            ? box
                            : {
                                ...box,
                                points: box.points.map((point) => ({
                                  ...point,
                                  image: {
                                    x: point.image.x + deltaX,
                                    y: point.image.y + deltaY,
                                  },
                                })),
                              }
                        )
                      );
                      setDraggingBox({ ...draggingBox, start: coords });
                    }
                  }}
                  onMouseUp={() => {
                    setDraggingCorner(null);
                    setDraggingBox(null);
                  }}
                  onMouseLeave={() => {
                    setDraggingCorner(null);
                    setDraggingBox(null);
                  }}
                  className="h-auto w-full cursor-crosshair origin-top-left"
                  style={{ transform: `scale(${zoom})` }}
                />
                {calibrationMode === "box" && activeBox && boxOverlay ? (
                  <div
                    onMouseDown={(event) => event.stopPropagation()}
                    className="absolute z-10 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-950/90 px-2 py-1 text-xs text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                    style={{ left: boxOverlay.left, top: boxOverlay.top }}
                  >
                    <span className="font-semibold">
                      {BOX_TYPES[activeBox.type].label}
                    </span>
                    <button
                      onClick={handleResetActiveBox}
                      className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/80"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        if (!activeBox.locked) {
                          setBoxSets((prev) =>
                            prev.map((box) =>
                              box.id === activeBox.id
                                ? { ...box, locked: true }
                                : box
                            )
                          );
                        }
                      }}
                      className="rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setBoxSets((prev) =>
                          prev.filter((box) => box.id !== activeBox.id)
                        );
                        setActiveBoxId(null);
                      }}
                      className="rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-white/60">
              Load a frame image to start calibration.
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[2fr_3fr]">
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Selected points: {validPoints.length} / {allPoints.length} (need 4+)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/60">Zoom</label>
                <input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.1"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/60">Overscan</label>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="20"
                  value={overscan}
                  onChange={(event) => setOverscan(Number(event.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {calibrationMode === "box" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/60">Boxes:</span>
                {boxSets.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => setActiveBoxId(box.id)}
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      box.id === activeBoxId
                        ? "border-amber-400/60 text-amber-200"
                        : "border-white/20 text-white/60"
                    }`}
                  >
                    {BOX_TYPES[box.type].label}
                    {box.locked ? " · locked" : ""}
                  </button>
                ))}
                <button
                  onClick={() => setActiveBoxId(null)}
                  className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/60"
                >
                  Clear active
                </button>
              </div>
              {boxMessage ? (
                <p className="text-xs text-amber-200">{boxMessage}</p>
              ) : null}
              {activeBoxId ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        setBoxSets((prev) =>
                          prev.map((box) =>
                            box.id === activeBoxId ? { ...box, locked: true } : box
                          )
                        )
                      }
                      disabled={activeBox?.locked}
                      className="rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200"
                    >
                      Confirm box
                    </button>
                    <button
                      onClick={() =>
                        setBoxSets((prev) => prev.filter((box) => box.id !== activeBoxId))
                      }
                      className="rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-200"
                    >
                      Delete box
                    </button>
                    <button
                      onClick={() => {
                        if (activeBox && !activeBox.locked) {
                          setBoxSets((prev) =>
                            prev.filter((box) => box.id !== activeBoxId)
                          );
                        }
                        setActiveBoxId(null);
                      }}
                      className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/70"
                    >
                      {activeBox?.locked ? "Close" : "Cancel"}
                    </button>
                  </div>
                  {activeBox?.points.map((point, index) => (
                      <div
                        key={`${point.id}-${index}`}
                        className="grid gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70 md:grid-cols-[2fr_1fr_1fr]"
                      >
                        <span>
                          {index + 1}. {point.label} → ({point.field.x},{point.field.y})
                        </span>
                        <input
                          type="number"
                          step="1"
                          value={point.image.x}
                          onChange={(event) =>
                            updateBoxPoint(index, "x", Number(event.target.value))
                          }
                          disabled={activeBox.locked}
                          className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs text-white"
                          placeholder="x"
                        />
                        <input
                          type="number"
                          step="1"
                          value={point.image.y}
                          onChange={(event) =>
                            updateBoxPoint(index, "y", Number(event.target.value))
                          }
                          disabled={activeBox.locked}
                          className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs text-white"
                          placeholder="y"
                        />
                      </div>
                    ))}
                </>
              ) : (
                <p className="text-xs text-white/50">
                  Click to place a rectangle. Drag corners or the box to align.
                </p>
              )}
            </div>
          ) : null}

          {points.length === 0 ? (
            <p className="text-xs text-white/50">No landmarks selected yet.</p>
          ) : (
            points.map((point, index) => (
              <div
                key={`${point.id}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70"
              >
                <span>
                  {index + 1}. {point.label} → ({point.field.x}, {point.field.y})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50">
                    img ({point.image.x},{point.image.y})
                  </span>
                  <button
                    onClick={() =>
                      setPoints((prev) =>
                        prev.filter((item) => item.id !== point.id)
                      )
                    }
                    className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/70"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent calibrations</h2>
            <p className="mt-2 text-sm text-white/60">
              Load a previously saved calibration from Supabase.
            </p>
          </div>
          <button
            onClick={refreshCalibrations}
            className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/80"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {loadingCalibrations ? (
            <p className="text-sm text-white/60">Loading...</p>
          ) : calibrations.length === 0 ? (
            <p className="text-sm text-white/60">No calibrations yet.</p>
          ) : (
            calibrations.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2"
              >
                <div className="text-sm text-white/70">
                  <div className="font-semibold text-white">
                    {row.event_uuid || "No event UUID"}
                  </div>
                  <div className="text-xs text-white/50">{row.image_path}</div>
                </div>
                <button
                  onClick={() => handleLoadCalibration(row)}
                  className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-black"
                >
                  Load
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Calibration JSON</h2>
        <p className="mt-2 text-sm text-white/60">
          Save this file and pass it to `CALIBRATION_JSON` for the art pipeline.
        </p>
        <textarea
          readOnly
          value={jsonOutput}
          className="mt-4 h-40 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Data line preview</h2>
        <p className="mt-2 text-sm text-white/60">
          Shows nearby events around the selected event for quick context.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40">
          {loadingDataLine ? (
            <p className="p-4 text-sm text-white/60">Loading data line...</p>
          ) : dataLine.length === 0 ? (
            <p className="p-4 text-sm text-white/60">
              Select an event to see the data line.
            </p>
          ) : (
            <div className="max-h-64 overflow-auto">
              {dataLine.map((row, index) => (
                <div
                  key={`${row.event_id}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2 text-xs text-white/70"
                >
                  <span>
                    {row.minute ?? "-"}:{String(row.second ?? 0).padStart(2, "0")}
                  </span>
                  <span>{row.team_name || "Team"}</span>
                  <span>{row.player_name || "Player"}</span>
                  <span>{row.event_type || "Event"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Render preview</h2>
        <p className="mt-2 text-sm text-white/60">
          Uses the saved calibration to render a pitch preview for the selected
          event.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleRenderPreview}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Render preview
          </button>
          {renderStatus ? (
            <span className="text-xs text-white/60">{renderStatus}</span>
          ) : null}
        </div>
        {renderPreview ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <img src={renderPreview} alt="Render preview" className="w-full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
