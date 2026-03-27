"use client";

/**
 * GarmentViewer3D — generic 3D garment viewer
 * Applies artwork via world-space UV projection (seamless across seams).
 * Logo, moment badge, and name/number use THREE.DecalGeometry projected
 * directly onto the hoodie mesh surface — replaces CSS overlays.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

/* ── Local Draco decoder — no CDN dependency, works offline/firewalled ── */
if (typeof window !== "undefined") {
  useGLTF.setDecoderPath("/draco/");
}

/* ── Texture controls (exported so parent side-panel can drive them) ──── */
export interface TextureControls {
  repeat: number;      // 1–8  tiles across the garment
  rotation: number;    // 0–360 degrees
  offsetX: number;     // 0–1
  offsetY: number;     // 0–1
  brightness: number;  // 0.4–2.0
}

export const DEFAULT_TEXTURE_CONTROLS: TextureControls = {
  repeat: 1.5,  // Default pattern repeat 1.5X
  rotation: 78,  // 78° — passes flow from bottom, explode on chest (Windass penalty data)
  offsetX: 0.88,  // Default offset X for demo
  offsetY: 0,
  brightness: 1.0,
};

/* ── View controls (zoom + spin — parent side-panel driven) ───────────── */
export interface ViewControls {
  zoom: number;       // camera distance: 0.9–3.0
  spinSpeed: number;  // auto-rotate speed: 0–5
}

export const DEFAULT_VIEW_CONTROLS: ViewControls = {
  zoom: 2.2, // hoodie default; overridden per-garment via GARMENT_CONFIGS[].cameraZ
  spinSpeed: 0.6,
};

/* ── Badge data for the moment badge decal ─────────────────────────────── */
export interface BadgeData {
  scorerName: string | null;
  scorerNumber?: number | null;
  minute: number | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate: string | null;
}

// ── Per-garment decal position config (scene space) ─────────────────────
// All z values must be INSIDE the mesh surface:
//   front decals: z slightly < actual front surface (~0.28–0.30 for hoodie)
//   back decals:  z slightly > actual back surface  (~-0.28 for hoodie)
// depth (3rd size component) should be large enough to bridge seams (0.20–0.28)
export interface GarmentDecalConfig {
  /** Initial camera Z distance — tune so whole garment fits the viewport */
  cameraZ:    number;
  /** Swap front/back euler orientations — use when model was exported back-to-front */
  swapOrientations?: boolean;
  /** Start camera at -Z so the physical front (at -Z) faces the viewer on load */
  flipCameraZ?: boolean;
  // Badge (front — always shown)
  badgePos:   [number, number, number];  // scene x,y,z
  badgeSize:  [number, number, number];  // scene w,h,depth
  // Logo (front — optional)
  logoPos:    [number, number, number];
  logoSize:   [number, number, number];
  // Name strip (back — optional)
  namePos:    [number, number, number];
  nameSize:   [number, number, number];
  // Number (back — optional)
  numberPos:  [number, number, number];
  numberSize: [number, number, number];
}

// LOCKED: hoodie.glb — finalized 2026-03-07, do not change without David sign-off
const HOODIE_CONFIG: GarmentDecalConfig = {
  cameraZ: 1.9,
  // x-axis MIRRORED on hoodie.glb: positive x = viewer's LEFT
  // groupScale=1.6444, groupPos=(0.0001, -2.2344, 0.0127)
  badgePos:   [-0.20, -0.48, 0.30],   // lower-right pocket, slightly inside front
  badgeSize:  [0.10,  0.07,  0.22],   // deep projection to follow pocket contour
  logoPos:    [ 0.17,  0.18,  0.38],  // left chest — z pushed forward; 0.30→0.34→0.36→0.38 iterating on buried corner
  logoSize:   [0.14,  0.14,  0.34],  // width/height LOCKED; depth 0.14→0.22→0.28→0.34 to reach curved chest near neckline
  namePos:    [ 0.00,  0.14, -0.28],  // centre back, just above number
  nameSize:   [0.58,  0.13,  0.28],   // wide + deep to bridge centre seam
  numberPos:  [ 0.00, -0.08, -0.28],  // centre back, mid-back
  numberSize: [0.34,  0.36,  0.14],
};

// T-shirt: normalised via normalize-model.mjs (2026-03-07)
// groupScale≈1.6445, groupPos≈(0, -1.089, 0)
// Scene space: width=2.10, height=2.18, front z≈+0.47, back z≈-0.47
// Positions seeded from proportional mapping — tune visually
// T-shirt: same height as hoodie after height-normalisation (2026-03-07)
// groupScale≈0.990, scene: ~1.26w × 1.31h; front surface z≈+0.28, back z≈-0.22
// Positions/sizes match hoodie — same height means same config works.
// z slightly shallower than hoodie (thinner garment).
const TSHIRT_CONFIG: GarmentDecalConfig = {
  cameraZ: 1.9,   // same height as hoodie — same camera distance works
  badgePos:   [-0.26, -0.58,  0.24],
  badgeSize:  [0.10,   0.07,  0.20],
  logoPos:    [ 0.12,  0.26,  0.24],
  logoSize:   [0.14,   0.14,  0.14],
  namePos:    [ 0.00,  0.38, -0.22],
  nameSize:   [0.58,   0.13,  0.28],
  numberPos:  [ 0.00, -0.02, -0.22],
  numberSize: [0.34,   0.36,  0.26],
};

// Long sleeve: same scene height as t-shirt (1.31); slightly deeper model
// ── LONGSLEEVE_CONFIG — CONFIRMED by David 2026-03-07, do not change without sign-off ──
// Model quirks: exported back-to-front (swapOrientations), x-axis mirrored (x signs flipped vs hoodie/tshirt),
// physical front at -Z (flipCameraZ), belly bulge on lower front (badge moved to side).
// groupScale≈0.839; scene ~1.07w × 1.31h; front surface z≈-0.20, back z≈+0.22
const LONGSLEEVE_CONFIG: GarmentDecalConfig = {
  cameraZ: 1.9,
  swapOrientations: false,  // Fixed 2026-03-08: was showing backwards, removed swap
  flipCameraZ: true,  // physical front is at -Z; start camera there so front loads first
  badgePos:   [ 0.25, -0.44, -0.15],  // slightly further to side, tiny bit lower
  badgeSize:  [0.09,   0.07,  0.20],
  logoPos:    [-0.12,  0.32, -0.20],  // raised by just under one logo height (0.14)
  logoSize:   [0.14,   0.14,  0.26],
  namePos:    [ 0.00,  0.30,  0.22],
  nameSize:   [0.52,   0.13,  0.36],  // deeper projection to wrap curved back
  numberPos:  [ 0.00, -0.04,  0.22],
  numberSize: [0.32,   0.34,  0.36],  // deeper projection to wrap curved back
};

export const GARMENT_CONFIGS: Record<string, GarmentDecalConfig> = {
  hoodie:     HOODIE_CONFIG,
  tshirt:     TSHIRT_CONFIG,
  longsleeve: LONGSLEEVE_CONFIG,
};

export interface GarmentViewer3DProps {
  modelPath: string;
  /** garment type key — used to look up decal config */
  garmentType?: string;
  artworkUrl?: string | null;
  loading?: boolean;
  height?: number;
  className?: string;
  textureControls?: TextureControls;
  viewControls?: ViewControls;
  /** Team logo image URL */
  logoUrl?: string | null;
  /** Show/hide team logo decal */
  showLogo?: boolean;
  /** Moment badge data — always shown when present */
  badgeData?: BadgeData | null;
  /** Player name for back decal */
  playerName?: string | null;
  /** Player number for back decal */
  playerNumber?: number | null;
  /** Show/hide name + number on back */
  showNameNumber?: boolean;
  /** Team primary colour for badge accent */
  teamColour?: string;
}

/* ── Fallback gradient texture ────────────────────────────────────────── */
function createGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, "#DA291C");
  grad.addColorStop(0.45, "#1a0a0a");
  grad.addColorStop(0.55, "#0a0a1a");
  grad.addColorStop(1, "#DA291C");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Canvas texture generators ─────────────────────────────────────────── */

/* ── Badge texture — matches EditionCard design exactly ─────────────── */
function _badgeAbbrev(name: string): string {
  return name.toUpperCase()
    .replace("UNITED", "UTD").replace("WEDNESDAY", "WED")
    .replace("ATHLETIC", "ATH").replace("WANDERERS", "WAN");
}
function _badgeFmtName(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(" ").toUpperCase()}`;
  return raw.toUpperCase();
}
function _badgeOrdinal(n: number): string {
  const s = ["TH", "ST", "ND", "RD"], v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function createBadgeTexture(badgeData: BadgeData, teamColour: string): THREE.CanvasTexture {
  const W = 512, H = 280;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const accent = "#C9A84C";
  const r = 16;  // border radius

  // Background
  ctx.fillStyle = "rgb(18,18,20)";
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, r); ctx.fill();

  // Gold border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, r - 1); ctx.stroke();

  // Inner glow
  ctx.strokeStyle = accent + "22";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(6, 6, W - 12, H - 12, r - 3); ctx.stroke();

  // Corner rivets
  const rivetR = 6, pad = 16;
  for (const [rx, ry] of [[pad, pad], [W - pad, pad], [pad, H - pad], [W - pad, H - pad]]) {
    ctx.fillStyle = "rgb(40,38,30)";
    ctx.beginPath(); ctx.arc(rx, ry, rivetR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = accent + "99";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── LEFT COLUMN: minute + GOAL pill ──
  const dividerX = 130;

  // Big minute number
  const minStr = badgeData.minute != null ? `${badgeData.minute}'` : "";
  ctx.fillStyle = accent;
  ctx.font = "900 72px -apple-system, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(minStr, dividerX / 2, H * 0.38, dividerX - 20);

  // GOAL pill
  const pillW = 80, pillH = 28, pillX = dividerX / 2 - pillW / 2, pillY = H * 0.58;
  ctx.strokeStyle = accent + "cc";
  ctx.lineWidth = 1.5;
  ctx.fillStyle = "rgb(30,28,18)";
  ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = "900 14px -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("GOAL", dividerX / 2, pillY + pillH / 2);

  // Vertical divider
  ctx.strokeStyle = accent + "44";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dividerX, 24);
  ctx.lineTo(dividerX, H - 44);
  ctx.stroke();

  // ── RIGHT COLUMN: player info ──
  const rightX = dividerX + 20;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Player name
  const disp = _badgeFmtName(badgeData.scorerName);
  ctx.fillStyle = "rgb(235,232,220)";
  ctx.font = "900 32px -apple-system, sans-serif";
  ctx.fillText(disp, rightX, 70, W - rightX - 30);

  // Jersey number
  if (badgeData.scorerNumber != null) {
    ctx.fillStyle = accent + "cc";
    ctx.font = "700 22px -apple-system, sans-serif";
    ctx.fillText(`#${badgeData.scorerNumber}`, rightX, 100);
  }

  // Matchup line
  const ht = _badgeAbbrev(badgeData.homeTeam ?? "");
  const at = _badgeAbbrev(badgeData.awayTeam ?? "");
  const matchup = badgeData.homeScore != null && badgeData.awayScore != null
    ? `${ht}  ${badgeData.homeScore} – ${badgeData.awayScore}  ${at}`
    : `${ht}  vs  ${at}`;
  ctx.fillStyle = "rgb(180,175,145)";
  ctx.font = "600 17px -apple-system, sans-serif";
  ctx.fillText(matchup, rightX, 135, W - rightX - 30);

  // Minute label
  if (badgeData.minute != null) {
    ctx.fillStyle = "rgb(140,135,105)";
    ctx.font = "600 14px -apple-system, sans-serif";
    ctx.fillText(`${_badgeOrdinal(badgeData.minute)} MINUTE`, rightX, 165);
  }

  // Date
  if (badgeData.matchDate) {
    ctx.fillStyle = "rgb(100,95,70)";
    ctx.font = "400 13px -apple-system, sans-serif";
    ctx.fillText(badgeData.matchDate, rightX, 190);
  }

  // ── Bottom tagline ──
  ctx.strokeStyle = accent + "22";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, H - 36); ctx.lineTo(W - 20, H - 36); ctx.stroke();

  ctx.fillStyle = "rgb(90,85,60)";
  ctx.font = "400 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Officially certified moment · 1 of 200 · emotivx.com", W / 2, H - 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Surname only — wide strip for across-shoulders placement
function createNameTexture(name: string): THREE.CanvasTexture {
  const W = 512, H = 160;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  // Surname only: "R. LONGMAN" → "LONGMAN"
  const displayName = name.toUpperCase().replace(/^[A-Z]\.\s*/, "");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 100px Impact, Arial, sans-serif`;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 8;
  ctx.strokeText(displayName, W / 2, H / 2, W - 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(displayName, W / 2, H / 2, W - 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Large squad number only
function createNumberTexture(number: number): THREE.CanvasTexture {
  const W = 300, H = 340;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 280px Impact, Arial, sans-serif`;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 8;
  ctx.strokeText(String(number), W / 2, H / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(number), W / 2, H / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** @deprecated use createNameTexture + createNumberTexture separately */
function createNameNumberTexture(name: string, number: number, _teamColour: string): THREE.CanvasTexture {
  return createNameTexture(name); // fallback — not used directly anymore
  void number;
}

/* ── Find the main body mesh — largest bounding box volume ─────────────── */
// Volume beats vertex count: detail meshes (ribbing, cuffs, collar) can have
// more vertices than the main fabric but a smaller spatial footprint.
function findBodyMesh(root: THREE.Object3D): THREE.Mesh | null {
  let largest: THREE.Mesh | null = null;
  let maxVol = 0;
  const _s = new THREE.Vector3();
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
      if (!pos) return;
      const bbox = new THREE.Box3().setFromBufferAttribute(pos);
      bbox.getSize(_s);
      const vol = _s.x * _s.y * _s.z;
      if (vol > maxVol) {
        maxVol = vol;
        largest = mesh;
      }
    }
  });
  return largest;
}

/* ── Decal component ───────────────────────────────────────────────────── */
// position = in GROUP-LOCAL space (same coordinate space as the mesh geometry)
// size = in GROUP-LOCAL space
// The decal mesh is a child of the same group as the model, inheriting the same transform.
function DecalMesh({
  targetMesh,
  position,
  orientation,
  size,
  texture,
  visible = true,
}: {
  targetMesh: THREE.Mesh;
  position: THREE.Vector3;
  orientation: THREE.Euler;
  size: THREE.Vector3;
  texture: THREE.Texture;
  visible?: boolean;
}) {
  const decalGeometry = useMemo(() => {
    try {
      // Walk full parent chain — critical for models with node-level rotations (e.g. tshirt 90°X)
      targetMesh.updateWorldMatrix(true, false);
      return new DecalGeometry(targetMesh, position, orientation, size);
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMesh, position, orientation, size]);

  if (!decalGeometry) return null;

  return (
    <mesh geometry={decalGeometry} visible={visible}>
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        depthTest={true}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-8}
        polygonOffsetUnits={-8}
      />
    </mesh>
  );
}

/* ── Logo decal using drei useTexture (cached, survives HMR/context restore) ── */
function LogoDecalMesh({
  url, targetMesh, position, orientation, size, visible,
}: {
  url: string;
  targetMesh: THREE.Mesh;
  position: THREE.Vector3;
  orientation: THREE.Euler;
  size: THREE.Vector3;
  visible: boolean;
}) {
  const texture = useTexture(url);
  const decalGeometry = useMemo(() => {
    try {
      targetMesh.updateWorldMatrix(true, false); // full chain including rotation nodes
      return new DecalGeometry(targetMesh, position, orientation, size);
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMesh, position, orientation, size]);

  if (!decalGeometry) return null;
  return (
    <mesh geometry={decalGeometry} visible={visible}>
      <meshBasicMaterial map={texture} transparent alphaTest={0.01}
        depthTest={true} depthWrite={false}
        polygonOffset polygonOffsetFactor={-8} polygonOffsetUnits={-8} />
    </mesh>
  );
}

/* ── Inner mesh component ─────────────────────────────────────────────── */
function GarmentMesh({
  modelPath,
  garmentType = "hoodie",
  artworkUrl,
  controls,
  logoUrl,
  showLogo = true,
  badgeData,
  playerName,
  playerNumber,
  showNameNumber = true,
  teamColour = "#DA291C",
}: {
  modelPath: string;
  garmentType?: string;
  artworkUrl?: string | null;
  controls: TextureControls;
  logoUrl?: string | null;
  showLogo?: boolean;
  badgeData?: BadgeData | null;
  playerName?: string | null;
  playerNumber?: number | null;
  showNameNumber?: boolean;
  teamColour?: string;
}) {
  const { scene } = useGLTF(modelPath);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const artworkTexture = useMemo(() => {
    const tex = artworkUrl
      ? (() => {
          const t = new THREE.TextureLoader().load(artworkUrl);
          t.colorSpace = THREE.SRGBColorSpace;
          t.flipY = false;
          return t;
        })()
      : createGradientTexture();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  }, [artworkUrl]);

  const { clone, groupPos, groupScale, bodyMesh, sceneHeight } = useMemo(() => {
    try {
    const clone = scene.clone(true);
    materialsRef.current = [];

    clone.updateWorldMatrix(true, true);

    // Pass 1: world-space bounding box
    const worldBox = new THREE.Box3();
    const tempV = new THREE.Vector3();

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          tempV.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          tempV.applyMatrix4(mesh.matrixWorld);
          worldBox.expandByPoint(tempV);
        }
      }
    });

    const worldCentre = new THREE.Vector3();
    worldBox.getCenter(worldCentre);
    const worldSize = new THREE.Vector3();
    worldBox.getSize(worldSize);
    const normScale = Math.max(worldSize.x, worldSize.y, worldSize.z);

    // Pass 2: remap UVs to world-space
    const garmentCfg = GARMENT_CONFIGS[garmentType] ?? GARMENT_CONFIGS.hoodie;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry = mesh.geometry.clone();

        const pos = mesh.geometry.attributes.position;
        const uvArr = new Float32Array(pos.count * 2);

        for (let i = 0; i < pos.count; i++) {
          tempV.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          tempV.applyMatrix4(mesh.matrixWorld);
          uvArr[i * 2]     = (tempV.x - worldCentre.x) / normScale + 0.5;
          uvArr[i * 2 + 1] = (tempV.y - worldCentre.y) / normScale + 0.5;
        }
        mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));

        const mat = new THREE.MeshStandardMaterial({
          map: artworkTexture,
          roughness: 0.94,
          metalness: 0.0,
          envMapIntensity: 0.06,
        });
        mesh.material = mat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        materialsRef.current.push(mat);
      }
    });

    // Centre + scale
    const box = new THREE.Box3().setFromObject(clone);
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    const size = new THREE.Vector3();
    box.getSize(size);
    // Normalise to height (y-axis) so all garments are the same height in the viewport.
    // TARGET_SCENE_HEIGHT = hoodie natural height × hoodie groupScale = 0.796 × 1.6445 ≈ 1.31
    // All garments end up 1.31 scene units tall → same camera distance for all.
    // Width varies per garment (t-shirt narrower than hoodie — realistic).
    // TODO (pre-launch): source properly-proportioned GLB models — see PRE_LAUNCH.md
    const TARGET_SCENE_HEIGHT = 1.31;
    const maxDim = size.y > 0 ? size.y : Math.max(size.x, size.y, size.z);
    const groupScale = TARGET_SCENE_HEIGHT / maxDim;
    const groupPos = centre.clone().negate().multiplyScalar(groupScale);

    const bodyMesh = findBodyMesh(clone);
    const sceneHeight = size.y * groupScale; // height in scene units after normalisation

    return { clone, groupPos, groupScale, bodyMesh, sceneHeight };
    } catch (e: unknown) {
      console.error("[GarmentMesh] useMemo crash:", (e as Error)?.message, (e as Error)?.stack);
      throw e; // re-throw so ThreeErrorBoundary catches it
    }
  }, [scene, artworkTexture]);

  // Log ALL meshes in model — helps diagnose t-shirt/other models
  useEffect(() => {
    const meshes: Array<{name:string; verts:number}> = [];
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        meshes.push({ name: m.name || "(unnamed)", verts: m.geometry.attributes.position?.count ?? 0 });
      }
    });
    console.log(`[GarmentViewer3D][${garmentType}] All meshes in model:`, meshes);
    console.log(`[GarmentViewer3D][${garmentType}] bodyMesh found:`, bodyMesh ? `"${bodyMesh.name}" (${bodyMesh.geometry.attributes.position?.count} verts)` : "NULL — decals will not render!");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone, bodyMesh]);

  // Log model dimensions once for position tuning
  useEffect(() => {
    if (!bodyMesh) return;
    const box = new THREE.Box3().setFromObject(clone);
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    const size = new THREE.Vector3();
    box.getSize(size);
    const bboxInfo = {
      centre: { x: +centre.x.toFixed(4), y: +centre.y.toFixed(4), z: +centre.z.toFixed(4) },
      size: { x: +size.x.toFixed(4), y: +size.y.toFixed(4), z: +size.z.toFixed(4) },
      groupScale: +groupScale.toFixed(4),
      groupPos: { x: +groupPos.x.toFixed(4), y: +groupPos.y.toFixed(4), z: +groupPos.z.toFixed(4) },
    };
    console.log("[GarmentViewer3D] Model bounding box:", bboxInfo);
    (window as any).__garmentBBox = bboxInfo;

    // Sample front-facing vertices
    const pos = bodyMesh.geometry.attributes.position;
    const samples: Array<{ x: number; y: number; z: number }> = [];
    const tempV = new THREE.Vector3();
    for (let i = 0; i < Math.min(pos.count, 200); i += 20) {
      tempV.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      tempV.applyMatrix4(bodyMesh.matrixWorld);
      samples.push({ x: +tempV.x.toFixed(4), y: +tempV.y.toFixed(4), z: +tempV.z.toFixed(4) });
    }
    console.log("[GarmentViewer3D] Sample vertex positions:", samples);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyMesh]);

  // Live-update texture params
  useFrame(() => {
    artworkTexture.repeat.set(controls.repeat, controls.repeat);
    artworkTexture.offset.set(controls.offsetX, controls.offsetY);
    artworkTexture.rotation = (controls.rotation * Math.PI) / 180;
    artworkTexture.center.set(0.5, 0.5);
    artworkTexture.needsUpdate = true;
    for (const mat of materialsRef.current) {
      mat.color.setScalar(controls.brightness);
    }
  });

  // ── Decal textures ──────────────────────────────────────────────────

  // Badge texture
  const badgeTexture = useMemo(() => {
    if (!badgeData?.scorerName) return null;
    return createBadgeTexture(badgeData, teamColour);
  }, [badgeData, teamColour]);

  // Logo — proxy URL for CORS bypass; useTexture lives in LogoDecalMesh (Suspense-safe)
  const proxiedLogoUrl = logoUrl
    ? (logoUrl.startsWith("http") ? `/api/proxy/image?url=${encodeURIComponent(logoUrl)}` : logoUrl)
    : null;

  // Name + number — always computed; visibility controlled via `visible` prop on DecalMesh
  // (never null when data exists, so DecalMesh stays mounted and toggles cleanly)
  const nameTexture = useMemo(() => {
    if (!playerName) return null;
    return createNameTexture(playerName);
  }, [playerName]);

  const numberTexture = useMemo(() => {
    if (playerNumber == null) return null;
    return createNumberTexture(playerNumber);
  }, [playerNumber]);

  // ── Load per-garment config (falls back to hoodie if unknown) ────────
  const cfg = GARMENT_CONFIGS[garmentType] ?? GARMENT_CONFIGS.hoodie;

  // ── Shared orientations ──────────────────────────────────────────────
  const _frontEuler = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const _backEuler  = useMemo(() => new THREE.Euler(0, Math.PI, 0), []);
  // Some models are exported back-to-front — swap orientations so decals land on the right face
  const frontEuler = cfg.swapOrientations ? _backEuler : _frontEuler;
  const backEuler  = cfg.swapOrientations ? _frontEuler : _backEuler;

  // Inline calculations — explicit deps, no closure helpers that can go stale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const badgePos   = useMemo(() => new THREE.Vector3((cfg.badgePos[0]-groupPos.x)/groupScale,  (cfg.badgePos[1]-groupPos.y)/groupScale,  (cfg.badgePos[2]-groupPos.z)/groupScale),  [cfg, groupPos, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const badgeSize  = useMemo(() => new THREE.Vector3(cfg.badgeSize[0]/groupScale,  cfg.badgeSize[1]/groupScale,  cfg.badgeSize[2]/groupScale),  [cfg, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logoPos    = useMemo(() => new THREE.Vector3((cfg.logoPos[0]-groupPos.x)/groupScale,   (cfg.logoPos[1]-groupPos.y)/groupScale,   (cfg.logoPos[2]-groupPos.z)/groupScale),   [cfg, groupPos, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logoSize   = useMemo(() => new THREE.Vector3(cfg.logoSize[0]/groupScale,   cfg.logoSize[1]/groupScale,   cfg.logoSize[2]/groupScale),   [cfg, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const namePos    = useMemo(() => new THREE.Vector3((cfg.namePos[0]-groupPos.x)/groupScale,   (cfg.namePos[1]-groupPos.y)/groupScale,   (cfg.namePos[2]-groupPos.z)/groupScale),   [cfg, groupPos, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nameSize   = useMemo(() => new THREE.Vector3(cfg.nameSize[0]/groupScale,   cfg.nameSize[1]/groupScale,   cfg.nameSize[2]/groupScale),   [cfg, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const numberPos  = useMemo(() => new THREE.Vector3((cfg.numberPos[0]-groupPos.x)/groupScale, (cfg.numberPos[1]-groupPos.y)/groupScale, (cfg.numberPos[2]-groupPos.z)/groupScale), [cfg, groupPos, groupScale]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const numberSize = useMemo(() => new THREE.Vector3(cfg.numberSize[0]/groupScale, cfg.numberSize[1]/groupScale, cfg.numberSize[2]/groupScale), [cfg, groupScale]);

  return (
    <group scale={groupScale} position={[groupPos.x, groupPos.y, groupPos.z]}>
      <primitive object={clone} />

      {/* Badge — always on */}
      {bodyMesh && badgeTexture && (
        <DecalMesh targetMesh={bodyMesh} position={badgePos} orientation={frontEuler}
          size={badgeSize} texture={badgeTexture} visible={true} />
      )}

      {/* Logo — always mounted when URL available; visibility prop hides/shows without remount */}
      {bodyMesh && proxiedLogoUrl && (
        <Suspense fallback={null}>
          <LogoDecalMesh url={proxiedLogoUrl} targetMesh={bodyMesh}
            position={logoPos} orientation={frontEuler} size={logoSize} visible={showLogo} />
        </Suspense>
      )}

      {/* Name — short strip just below hood */}
      {bodyMesh && nameTexture && (
        <DecalMesh targetMesh={bodyMesh} position={namePos} orientation={backEuler}
          size={nameSize} texture={nameTexture} visible={showNameNumber} />
      )}

      {/* Number — large, mid-back */}
      {bodyMesh && numberTexture && (
        <DecalMesh targetMesh={bodyMesh} position={numberPos} orientation={backEuler}
          size={numberSize} texture={numberTexture} visible={showNameNumber} />
      )}
    </group>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────── */
function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-white/5" style={{ height }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/10 border-t-[#DA291C]" />
        <span className="text-xs text-white/40">Loading 3D model…</span>
      </div>
    </div>
  );
}

/* ── Main exported component ──────────────────────────────────────────── */
export default function GarmentViewer3D({
  modelPath,
  garmentType = "hoodie",
  artworkUrl,
  loading = false,
  height,
  className = "",
  textureControls = DEFAULT_TEXTURE_CONTROLS,
  viewControls = DEFAULT_VIEW_CONTROLS,
  logoUrl,
  showLogo = true,
  badgeData,
  playerName,
  playerNumber,
  showNameNumber = true,
  teamColour = "#DA291C",
}: GarmentViewer3DProps) {
  // Use per-garment camera Z from config unless caller has explicitly set a zoom
  const cfg = GARMENT_CONFIGS[garmentType] ?? GARMENT_CONFIGS.hoodie;
  const effectiveZoom = viewControls.zoom !== DEFAULT_VIEW_CONTROLS.zoom
    ? viewControls.zoom   // caller has overridden it
    : cfg.cameraZ;        // use garment-specific default

  const [showHint, setShowHint] = useState(true);
  const orbitRef = useRef<any>(null);

  useEffect(() => {
    if (!orbitRef.current) return;
    const orbit = orbitRef.current;
    orbit.autoRotateSpeed = viewControls.spinSpeed;
    const cam = orbit.object as THREE.PerspectiveCamera;
    if (cam) {
      const dir = cam.position.clone().normalize();
      cam.position.copy(dir.multiplyScalar(effectiveZoom));
      orbit.update();
    }
  }, [effectiveZoom, viewControls.spinSpeed]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative w-full select-none ${height ? "" : "h-full"} ${className}`}
      style={height ? { height } : undefined}
      onPointerDown={() => {
        setShowHint(false);
        if (orbitRef.current) orbitRef.current.autoRotate = false;
      }}
      onPointerUp={() => {
        setTimeout(() => {
          if (orbitRef.current) orbitRef.current.autoRotate = true;
        }, 2000);
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#DA291C]" />
            <span className="text-xs text-white/60">Generating artwork…</span>
          </div>
        </div>
      )}

      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/50 backdrop-blur-sm transition-opacity duration-700 ${
          showHint ? "opacity-100" : "opacity-0"
        }`}
      >
        ↻ Drag to rotate
      </div>

      <Suspense fallback={<LoadingSkeleton height={height} />}>
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: [0, 0, cfg.flipCameraZ ? -effectiveZoom : effectiveZoom], fov: 52 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[4, 6, 5]}  intensity={2.0} color="#fff8f0" castShadow shadow-mapSize={[2048, 2048]} />
          <directionalLight position={[-4, 3, 4]} intensity={0.8} color="#d0e0ff" />
          <directionalLight position={[0,  2, -4]} intensity={0.4} color="#8899ff" />
          <directionalLight position={[0, -4,  2]} intensity={0.3} color="#ffffff" />
          <Environment preset="warehouse" environmentIntensity={0.1} />

          <GarmentMesh
            modelPath={modelPath}
            garmentType={garmentType}
            artworkUrl={artworkUrl}
            controls={textureControls}
            logoUrl={logoUrl}
            showLogo={showLogo}
            badgeData={badgeData}
            playerName={playerName}
            playerNumber={playerNumber}
            showNameNumber={showNameNumber}
            teamColour={teamColour}
          />

          <OrbitControls
            ref={orbitRef}
            enableZoom
            enablePan={false}
            autoRotate
            autoRotateSpeed={viewControls.spinSpeed}
            minPolarAngle={Math.PI / 2 - 0.28}
            maxPolarAngle={Math.PI / 2 + 0.28}
            minDistance={0.8}
            maxDistance={3.5}
            target={[0, 0, 0]}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
