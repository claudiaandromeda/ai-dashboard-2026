/**
 * 360° Goal Viewer — Interactive 3D scene
 * Spin around the goal moment with your mouse
 * Three.js + React Three Fiber
 */
"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line, Sphere, Cylinder, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

interface BallPathPoint { x: number; y: number; z: number; type: "pass" | "carry" | "shot"; eventIndex?: number; }
interface FreezePlayer { x: number; y: number; teammate: boolean; goalkeeper: boolean; playerName: string; jersey: number; }
interface BuildupPlayerPos { id: number; x: number; y: number; name: string; teamId: number; jersey: number; isActive: boolean; isRecipient: boolean; }
interface BuildupEvent {
  type: string; playerName: string; playerId: number; teamId: number;
  startX: number; startY: number; startZ: number;
  endX: number; endY: number; endZ: number;
  minute: number; second: number; duration: number;
  bodyPart: string | null; passHeight: string | null; outcome: string | null;
  technique: string | null; recipient: string | null; xg: number | null;
  keyPass: boolean; firstTime: boolean; hasFreezeFrame: boolean;
  playerPositions: BuildupPlayerPos[];
}
interface Goal {
  index: number; player: string; team: string; teamId: number; minute: number;
  xg: number; bodyPart: string; technique: string;
  startX: number; startY: number; startZ: number;
  endX: number; endY: number; endZ: number;
  distanceM: number; speedKmh: number; speedMph: number;
  freezeFrame: FreezePlayer[];
  buildup: BuildupEvent[];
  ballPath: BallPathPoint[];
  playerData: { name: string; jersey: number; };
}

const WREXHAM_ID = 1557;

/* ─── Raw Data Points Renderer ────────────────────────────────────────────
 * Shows sparse data points (either event endpoints or all waypoints) as 
 * numbered spheres to demonstrate interpolation input vs output.
 * ANIMATED: points appear progressively over time to show data capture process.
 * ──────────────────────────────────────────────────────────────────────── */
function RawDataPoints({ ballPath, mode, progress = 1.0 }: { ballPath: BallPathPoint[]; mode: "sparse" | "all"; progress?: number }) {
  const points = useMemo(() => {
    if (mode === "all") {
      // Show ALL waypoints as discrete points
      return ballPath.map((p, i) => ({ ...p, index: i }));
    } else {
      // Show only event endpoints (sparse: each distinct eventIndex = one sphere)
      const eventMap = new Map<number, BallPathPoint & { index: number }>();
      ballPath.forEach((p, i) => {
        const eIdx = p.eventIndex ?? 0;
        if (!eventMap.has(eIdx)) {
          eventMap.set(eIdx, { ...p, index: eventMap.size });
        }
      });
      return Array.from(eventMap.values());
    }
  }, [ballPath, mode]);

  // Only show points up to current progress (animated reveal)
  const visibleCount = Math.floor(points.length * progress);

  return (
    <group>
      {points.slice(0, visibleCount).map((p, idx) => {
        const [x, y, z] = toScene(p.x, p.y, p.z);
        // Color by type: pass=cyan, carry=yellow, shot=red
        const color = p.type === "pass" ? "#00ffff" : p.type === "carry" ? "#ffdd00" : "#ff4444";
        // Fade in recently appeared points
        const recency = idx === visibleCount - 1 ? 0.5 : 1.0;
        return (
          <group key={idx} position={[x, y + 0.5, z]}>
            {/* Sphere */}
            <Sphere args={[0.5, 16, 16]}>
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8 * recency} />
            </Sphere>
            {/* Number label */}
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.8}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.1}
              outlineColor="#000"
              fillOpacity={recency}>
              {p.index + 1}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/* ─── Animated Raw Data Wrapper ─── */
function AnimatedRawData({ ballPath, mode, isPlaying, playbackSpeed }: {
  ballPath: BallPathPoint[]; mode: "sparse" | "all"; isPlaying: boolean; playbackSpeed: number;
}) {
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => { progressRef.current = 0; setProgress(0); }, [ballPath, mode]);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    // 5x faster than Replay mode for Raw Data
    progressRef.current += delta * playbackSpeed * 0.5;
    const p = Math.min(progressRef.current, 1.0);
    setProgress(p);
  });

  return <RawDataPoints ballPath={ballPath} mode={mode} progress={progress} />;
}

/* ─── Ball Path Camera Controller ─────────────────────────────────────────
 * When ball path mode is active, smoothly flies the camera to an overhead
 * angled view that shows the entire path laid out on the pitch.
 * When deactivated, returns to the shot-focused position.
 * ──────────────────────────────────────────────────────────────────────── */
function BallPathCamera({ waypoints, active, cameraLocked, fallbackTarget }: {
  waypoints: BallPathPoint[]; active: boolean; cameraLocked: boolean; fallbackTarget: [number, number, number];
}) {
  const { camera, controls } = useThree();

  // Pre-compute the overview camera position and orbit target from the path
  const [overviewPos, overviewTarget] = useMemo(() => {
    if (!waypoints.length) return [new THREE.Vector3(-15, 12, 35), new THREE.Vector3(0, 0, 0)];

    const pts = waypoints.map(p => {
      const [x, y, z] = toScene(p.x, p.y, p.z);
      return new THREE.Vector3(x, y, z);
    });

    // Centroid of path in scene coords
    const center = pts.reduce((acc, p) => acc.clone().add(p), new THREE.Vector3()).divideScalar(pts.length);

    // Bounding box — determines how high / far back to put the camera
    const bbox = new THREE.Box3().setFromPoints(pts);
    const size = bbox.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 30); // minimum 30 units to avoid being too close

    // Place camera at ~50° angle — far enough to see the whole path,
    // close enough that the pitch surface texture is visible
    const camPos = new THREE.Vector3(
      center.x - span * 0.45,   // behind the attack direction
      span * 0.58,               // height: ~50° elevation angle
      center.z + span * 0.18,   // slight side offset
    );

    return [camPos, new THREE.Vector3(center.x, 0, center.z)];
  }, [waypoints]);

  // Fallback (shot-focused) camera position and target
  const [defaultPos] = useState(() => new THREE.Vector3(-15, 12, 35));
  const defaultTarget = useMemo(
    () => new THREE.Vector3(fallbackTarget[0], fallbackTarget[1], fallbackTarget[2]),
    [fallbackTarget]
  );

  useFrame((_, delta) => {
    // Only drive the camera when ball path is active AND user hasn't unlocked manual control
    if (!active || !cameraLocked) return;

    const lerpSpeed  = delta * 2.2;
    camera.position.lerp(overviewPos, lerpSpeed);

    if (controls) {
      const oc = controls as any;
      if (oc.target) {
        oc.target.lerp(overviewTarget, lerpSpeed);
        oc.update();
      }
    }
  });

  return null;
}
// Pitch conversion: StatsBomb 120x80 → 3D scene (centred at origin)
const PITCH_L = 60; // half-length (x)
const PITCH_W = 40; // half-width (z)
const toScene = (sbX: number, sbY: number, sbZ: number = 0): [number, number, number] => {
  // StatsBomb: x 0-120 (length), y 0-80 (width), z = height in metres (real world)
  // Scene: x = length (-60 to 60), z = width (-40 to 40), y = height (1:1 with metres)
  return [
    (sbX / 120) * PITCH_L * 2 - PITCH_L,
    sbZ, // real-world metres — crossbar is 2.44m, ball heights are accurate
    (sbY / 80) * PITCH_W * 2 - PITCH_W,
  ];
};

/* ─── Sky Dome ─── */
function Sky() {
  return (
    <group>
      {/* Sky hemisphere */}
      <Sphere args={[180, 32, 16]}>
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </Sphere>
      {/* Horizon haze band */}
      <Sphere args={[179, 32, 8]}>
        <meshBasicMaterial color="#b8d8f0" side={THREE.BackSide} transparent opacity={0.4} />
      </Sphere>
      {/* Sun glow */}
      <Sphere args={[3, 16, 16]} position={[60, 80, -40]}>
        <meshBasicMaterial color="#fff8e0" />
      </Sphere>
      <pointLight position={[60, 80, -40]} color="#fff5e0" intensity={0.5} distance={200} />
      {/* Wispy clouds */}
      {[
        [30, 70, -60], [-50, 65, -30], [10, 75, 50], [-30, 68, 70], [60, 72, 20],
        [-20, 66, -50], [45, 69, 40], [-55, 73, 10], [25, 67, -20],
      ].map(([x, y, z], i) => (
        <group key={`cloud-${i}`} position={[x, y, z]}>
          <Sphere args={[4 + i % 3, 8, 6]} position={[0, 0, 0]}>
            <meshBasicMaterial color="white" transparent opacity={0.7} />
          </Sphere>
          <Sphere args={[3 + i % 2, 8, 6]} position={[3, -0.5, 1]}>
            <meshBasicMaterial color="white" transparent opacity={0.6} />
          </Sphere>
          <Sphere args={[2.5, 8, 6]} position={[-2, -0.3, -1]}>
            <meshBasicMaterial color="white" transparent opacity={0.5} />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

/* ─── 3D Pitch ─── */
function Pitch() {
  return (
    <group>
      {/* Surrounding grass / track area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a7d44" roughness={0.95} />
      </mesh>
      {/* Pitch surface — bright Premier League green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[PITCH_L * 2 + 4, PITCH_W * 2 + 4]} />
        <meshStandardMaterial color="#2d8c3c" roughness={0.85} />
      </mesh>
      {/* Mowing stripes — alternating light/dark */}
      {Array.from({ length: 12 }).map((_, i) => {
        const stripeW = (PITCH_L * 2) / 12;
        const x = -PITCH_L + i * stripeW + stripeW / 2;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.04, 0]} receiveShadow>
            <planeGeometry args={[stripeW, PITCH_W * 2 + 2]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#34993f" : "#268a32"} roughness={0.9} />
          </mesh>
        );
      })}
      {/* Pitch lines */}
      <Line points={[[-PITCH_L, 0, -PITCH_W], [PITCH_L, 0, -PITCH_W], [PITCH_L, 0, PITCH_W], [-PITCH_L, 0, PITCH_W], [-PITCH_L, 0, -PITCH_W]]}
        color="white" lineWidth={1} transparent opacity={0.3} />
      {/* Centre line */}
      <Line points={[[0, 0, -PITCH_W], [0, 0, PITCH_W]]} color="white" lineWidth={1} transparent opacity={0.2} />
      {/* Centre circle */}
      {(() => {
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push([Math.cos(a) * 9.15, 0, Math.sin(a) * 9.15]);
        }
        return <Line points={pts} color="white" lineWidth={1} transparent opacity={0.2} />;
      })()}
      {/* Penalty boxes (right side — attacking end) */}
      {[1, -1].map(side => (
        <group key={side}>
          <Line points={[
            [side * PITCH_L, 0, -20], [side * (PITCH_L - 18), 0, -20],
            [side * (PITCH_L - 18), 0, 20], [side * PITCH_L, 0, 20]
          ]} color="white" lineWidth={1} transparent opacity={0.2} />
          {/* 6-yard box */}
          <Line points={[
            [side * PITCH_L, 0, -10], [side * (PITCH_L - 6), 0, -10],
            [side * (PITCH_L - 6), 0, 10], [side * PITCH_L, 0, 10]
          ]} color="white" lineWidth={1} transparent opacity={0.15} />
          {/* Goal */}
          <Line points={[
            [side * PITCH_L, 0, -3.66], [side * PITCH_L, 2.44, -3.66],
            [side * PITCH_L, 2.44, 3.66], [side * PITCH_L, 0, 3.66],
          ]} color="white" lineWidth={2} transparent opacity={0.5} />
          {/* Goal net (back) */}
          <Line points={[
            [side * (PITCH_L + 2), 0, -3.66], [side * (PITCH_L + 2), 2.44, -3.66],
            [side * (PITCH_L + 2), 2.44, 3.66], [side * (PITCH_L + 2), 0, 3.66],
            [side * (PITCH_L + 2), 0, -3.66],
          ]} color="white" lineWidth={1} transparent opacity={0.15} />
          {/* Net connections */}
          <Line points={[[side * PITCH_L, 2.44, -3.66], [side * (PITCH_L + 2), 2.44, -3.66]]} color="white" lineWidth={1} transparent opacity={0.1} />
          <Line points={[[side * PITCH_L, 2.44, 3.66], [side * (PITCH_L + 2), 2.44, 3.66]]} color="white" lineWidth={1} transparent opacity={0.1} />
          <Line points={[[side * PITCH_L, 0, -3.66], [side * (PITCH_L + 2), 0, -3.66]]} color="white" lineWidth={1} transparent opacity={0.1} />
          <Line points={[[side * PITCH_L, 0, 3.66], [side * (PITCH_L + 2), 0, 3.66]]} color="white" lineWidth={1} transparent opacity={0.1} />
        </group>
      ))}
    </group>
  );
}

/* ─── Seeded random for consistent player appearance ─── */
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

const HAIR_COLORS = ["#1a1005", "#2a1a0a", "#3d2b1a", "#5c3a1e", "#8b6914", "#c4a35a", "#e8d5a3", "#d44a1a", "#1a1a1a", "#f5e6c8"];
const SKIN_TONES = ["#f5d0b0", "#e8b88a", "#d4956a", "#b87040", "#8b5030", "#5c3420"];
const BOOT_COLORS = ["#111111", "#1a1a2e", "#2d1b4e", "#ff4444", "#ff8800", "#44ff44", "#ffffff"];

/* ─── Footballer Figure ─── */
function PlayerFigure({ position, color, isGoalkeeper, isShooter, playerIndex, label, jersey, onSelect, isSelected }: {
  position: [number, number, number]; color: string; isGoalkeeper: boolean; isShooter: boolean;
  playerIndex: number; label?: string; jersey?: number; onSelect?: () => void; isSelected?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const emissiveIntensity = isShooter ? 0.5 : (isGoalkeeper ? 0.3 : 0.1);

  // Deterministic appearance per player
  const rng = seededRandom(playerIndex * 7919 + 31);
  const skinTone = SKIN_TONES[Math.floor(rng() * SKIN_TONES.length)];
  const hairColor = HAIR_COLORS[Math.floor(rng() * HAIR_COLORS.length)];
  const hairStyle = Math.floor(rng() * 4); // 0=short, 1=medium, 2=long, 3=bald
  const bootColor = BOOT_COLORS[Math.floor(rng() * BOOT_COLORS.length)];
  const isLefty = rng() > 0.85; // ~15% left-footed
  const bodyScale = 0.9 + rng() * 0.25; // slight height/build variation
  const shortsColor = isGoalkeeper ? "#333333" : color;
  const jerseyColor = isGoalkeeper ? "#88cc00" : color;

  useFrame((state) => {
    if (ref.current && isShooter) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
    if (glowRef.current && isShooter) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      glowRef.current.scale.set(s, 1, s);
    }
  });

  const sc = bodyScale;

  return (
    <group ref={ref} position={position} scale={[sc, sc, sc]}>
      {/* === BOOTS === */}
      <group>
        {/* Left boot */}
        <Cylinder args={[0.12, 0.14, 0.2, 8]} position={[-0.15, 0.1, 0.06]} rotation={[0.3, 0, 0]}>
          <meshStandardMaterial color={bootColor} roughness={0.2} metalness={0.4} />
        </Cylinder>
        {/* Right boot — kicked forward if shooter */}
        <Cylinder args={[0.12, 0.14, 0.2, 8]}
          position={[0.15, isShooter ? 0.25 : 0.1, isShooter ? 0.25 : 0.06]}
          rotation={[isShooter ? (isLefty ? 0.3 : 1.2) : 0.3, 0, 0]}>
          <meshStandardMaterial color={bootColor} roughness={0.2} metalness={0.4} />
        </Cylinder>
      </group>

      {/* === SOCKS === */}
      <Cylinder args={[0.1, 0.12, 0.4, 8]} position={[-0.15, 0.35, 0]}>
        <meshStandardMaterial color="white" roughness={0.6} />
      </Cylinder>
      <Cylinder args={[0.1, 0.12, 0.4, 8]} position={[0.15, 0.35, 0]}>
        <meshStandardMaterial color="white" roughness={0.6} />
      </Cylinder>

      {/* === LEGS (thighs — skin) === */}
      <Cylinder args={[0.12, 0.1, 0.35, 8]} position={[-0.13, 0.72, 0]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Cylinder>
      <Cylinder args={[0.12, 0.1, 0.35, 8]} position={[0.13, 0.72, 0]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Cylinder>

      {/* === SHORTS === */}
      <Cylinder args={[0.22, 0.25, 0.35, 8]} position={[0, 1.0, 0]}>
        <meshStandardMaterial color={shortsColor} emissive={shortsColor} emissiveIntensity={emissiveIntensity * 0.3} roughness={0.5} />
      </Cylinder>

      {/* === JERSEY (torso) === */}
      <Cylinder args={[0.2, 0.24, 0.55, 10]} position={[0, 1.42, 0]}>
        <meshStandardMaterial color={jerseyColor} emissive={jerseyColor} emissiveIntensity={emissiveIntensity} roughness={0.4} metalness={0.3} />
      </Cylinder>

      {/* === ARMS (skin) === */}
      {/* Left arm */}
      <Cylinder args={[0.06, 0.07, 0.45, 6]} position={[-0.3, 1.35, 0]} rotation={[0, 0, 0.3]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Cylinder>
      {/* Right arm — raised if shooter */}
      <Cylinder args={[0.06, 0.07, 0.45, 6]}
        position={[0.3, isShooter ? 1.55 : 1.35, isShooter ? -0.1 : 0]}
        rotation={[isShooter ? -0.5 : 0, 0, isShooter ? -0.8 : -0.3]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Cylinder>

      {/* === NECK === */}
      <Cylinder args={[0.07, 0.08, 0.1, 8]} position={[0, 1.73, 0]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Cylinder>

      {/* === HEAD === */}
      <Sphere args={[0.18, 16, 16]} position={[0, 1.9, 0]}>
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </Sphere>

      {/* === HAIR === */}
      {hairStyle === 0 && (
        /* Short hair — skull cap */
        <Sphere args={[0.19, 16, 12]} position={[0, 1.93, -0.01]}>
          <meshStandardMaterial color={hairColor} roughness={0.8} />
        </Sphere>
      )}
      {hairStyle === 1 && (
        /* Medium — slightly bigger with fringe */
        <group>
          <Sphere args={[0.2, 16, 12]} position={[0, 1.95, -0.02]}>
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </Sphere>
          {/* Fringe */}
          <Cylinder args={[0.15, 0.18, 0.04, 8]} position={[0, 2.05, 0.08]} rotation={[0.4, 0, 0]}>
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </Cylinder>
        </group>
      )}
      {hairStyle === 2 && (
        /* Longer — flows back */
        <group>
          <Sphere args={[0.21, 16, 12]} position={[0, 1.95, -0.03]}>
            <meshStandardMaterial color={hairColor} roughness={0.6} />
          </Sphere>
          <Cylinder args={[0.12, 0.15, 0.15, 8]} position={[0, 1.85, -0.12]} rotation={[0.3, 0, 0]}>
            <meshStandardMaterial color={hairColor} roughness={0.6} />
          </Cylinder>
        </group>
      )}
      {/* hairStyle === 3 = bald, no hair mesh */}

      {/* === GOALKEEPER GLOVES === */}
      {isGoalkeeper && (
        <>
          <Sphere args={[0.09, 8, 8]} position={[-0.38, 1.5, 0.05]}>
            <meshStandardMaterial color="#88cc00" emissive="#88cc00" emissiveIntensity={0.3} />
          </Sphere>
          <Sphere args={[0.09, 8, 8]} position={[0.38, 1.5, 0.05]}>
            <meshStandardMaterial color="#88cc00" emissive="#88cc00" emissiveIntensity={0.3} />
          </Sphere>
        </>
      )}

      {/* === GROUND EFFECTS === */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[isShooter ? 1.5 : 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={isShooter ? 0.3 : 0.1} side={THREE.DoubleSide} />
      </mesh>

      {isShooter && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[1.2, 1.6, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[1.8, 2.1, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {isGoalkeeper && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.7, 1.0, 32]} />
          <meshBasicMaterial color="#88cc00" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* === LABEL — name + jersey above head === */}
      {label && (
        <group position={[0, 2.4, 0]}>
          {/* Background pill */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.8, 0.5]} />
            <meshBasicMaterial color={isSelected ? "#ffffff" : color} transparent opacity={isSelected ? 0.9 : 0.7} side={THREE.DoubleSide} />
          </mesh>
          {/* Jersey number */}
          <Text position={[-0.55, 0, 0]} fontSize={0.3} color={isSelected ? "#000000" : "white"} anchorX="center" anchorY="middle" fontWeight="bold">
            {`${jersey || ""}`}
          </Text>
          {/* Player name */}
          <Text position={[0.2, 0, 0]} fontSize={0.22} color={isSelected ? "#000000" : "white"} anchorX="center" anchorY="middle">
            {label}
          </Text>
          {/* Selection indicator */}
          {isSelected && (
            <mesh position={[0, 0.35, 0]}>
              <coneGeometry args={[0.12, 0.2, 4]} />
              <meshBasicMaterial color="white" />
            </mesh>
          )}
        </group>
      )}

      {/* Click target — invisible large sphere */}
      {onSelect && (
        <mesh position={[0, 1.0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          <sphereGeometry args={[1.2, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}

/* ─── Crowd Person (mini figure in stands) ─── */
function CrowdPerson({ position, shirtColor, seed }: { position: [number, number, number]; shirtColor: string; seed: number }) {
  const rng = seededRandom(seed);
  const skinTone = SKIN_TONES[Math.floor(rng() * SKIN_TONES.length)];
  const hairColor = HAIR_COLORS[Math.floor(rng() * HAIR_COLORS.length)];
  const hasHat = rng() > 0.85;
  const isStanding = rng() > 0.85;
  const s = isStanding ? 0.8 : 0.65;

  return (
    <group position={position} scale={[s, s, s]}>
      {/* Torso */}
      <Cylinder args={[0.2, 0.22, 0.6, 6]} position={[0, isStanding ? 0.7 : 0.3, 0]}>
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </Cylinder>
      {/* Head */}
      <Sphere args={[0.14, 6, 6]} position={[0, isStanding ? 1.15 : 0.72, 0]}>
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </Sphere>
      {/* Hair/hat */}
      {hasHat ? (
        <Cylinder args={[0.18, 0.16, 0.08, 6]} position={[0, isStanding ? 1.28 : 0.85, 0]}>
          <meshStandardMaterial color={rng() > 0.5 ? "#cc2233" : "#ffffff"} roughness={0.5} />
        </Cylinder>
      ) : (
        <Sphere args={[0.145, 6, 4]} position={[0, isStanding ? 1.22 : 0.79, 0]}>
          <meshStandardMaterial color={hairColor} roughness={0.8} />
        </Sphere>
      )}
    </group>
  );
}

/* ─── Stadium ─── */
function Stadium() {
  const concrete = "#d4cfc8";
  const concreteDark = "#8a8580";
  const steel = "#606875";

  // Generate crowd
  const rng = seededRandom(42);
  const crowd: { pos: [number, number, number]; color: string; seed: number }[] = [];
  const homeColors = ["#BA0C2F", "#cc2233", "#ff3344", "#ee1133", "#dd4455", "#ffffff"]; // Wrexham red + white
  const awayColors = ["#2266ff", "#4488ff", "#6699ff", "#ffffff"]; // Blue + white

  // Side stands — rows of people (HOME FANS - red)
  for (const side of [1, -1]) {
    for (let row = 0; row < 10; row++) {
      const y = 2.5 + row * 1.2;
      const z = side * (PITCH_W + 5 + row * 1.5);
      const spacing = 0.5; // DOUBLED density
      const count = Math.floor((PITCH_L * 2) / spacing);
      for (let i = 0; i < count; i++) {
        if (rng() > 0.02) { // ~98% occupancy (packed)
          const x = -PITCH_L + i * spacing + (rng() - 0.5) * 0.15;
          crowd.push({
            pos: [x, y, z + (rng() - 0.5) * 0.15],
            color: homeColors[Math.floor(rng() * homeColors.length)],
            seed: row * 1000 + i + side * 10000,
          });
        }
      }
    }
  }

  // End stands
  for (const side of [1, -1]) {
    // Side -1 = AWAY FANS (blue), Side 1 = HOME FANS (red)
    const colors = side === -1 ? awayColors : homeColors;
    for (let row = 0; row < 8; row++) {
      const x = side * (PITCH_L + 5 + row * 1.5);
      const y = 2.5 + row * 1.2;
      const spacing = 0.5; // DOUBLED density
      const count = Math.floor((PITCH_W * 2 - 4) / spacing);
      for (let i = 0; i < count; i++) {
        if (rng() > 0.02) { // ~98% occupancy
          const z = -(PITCH_W - 2) + i * spacing + (rng() - 0.5) * 0.15;
          crowd.push({
            pos: [x + (rng() - 0.5) * 0.15, y, z],
            color: colors[Math.floor(rng() * colors.length)],
            seed: row * 2000 + i + side * 20000,
          });
        }
      }
    }
  }

  return (
    <group>
      {/* ── Side Stands ── */}
      {[1, -1].map(side => (
        <group key={`side-${side}`}>
          {/* Stepped concrete terracing */}
          {Array.from({ length: 10 }).map((_, row) => (
            <mesh key={row}
              position={[0, 1.5 + row * 1.2, side * (PITCH_W + 4.5 + row * 1.5)]}>
              <boxGeometry args={[PITCH_L * 2 + 6, 1.2, 1.5]} />
              <meshStandardMaterial color={row % 2 === 0 ? concrete : "#ccc8c0"} roughness={0.85} />
            </mesh>
          ))}
          {/* Back wall */}
          <mesh position={[0, 7, side * (PITCH_W + 18)]}>
            <boxGeometry args={[PITCH_L * 2 + 8, 14, 0.8]} />
            <meshStandardMaterial color={concreteDark} roughness={0.9} />
          </mesh>
          {/* Roof — steel truss */}
          <mesh position={[0, 14.5, side * (PITCH_W + 12)]}>
            <boxGeometry args={[PITCH_L * 2 + 8, 0.3, 14]} />
            <meshStandardMaterial color={steel} roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Roof supports — steel columns */}
          {Array.from({ length: 10 }).map((_, i) => {
            const x = -PITCH_L + 6 + i * ((PITCH_L * 2 - 12) / 9);
            return (
              <Cylinder key={i} args={[0.15, 0.15, 12, 6]}
                position={[x, 8.5, side * (PITCH_W + 17.5)]}>
                <meshStandardMaterial color={steel} roughness={0.3} metalness={0.8} />
              </Cylinder>
            );
          })}
          {/* Fascia / branding strip */}
          <mesh position={[0, 13.8, side * (PITCH_W + 5)]}>
            <boxGeometry args={[PITCH_L * 2 + 6, 1.2, 0.2]} />
            <meshStandardMaterial color="#cc2233" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* ── End Stands ── */}
      {[1, -1].map(side => (
        <group key={`end-${side}`}>
          {Array.from({ length: 8 }).map((_, row) => (
            <mesh key={row}
              position={[side * (PITCH_L + 4.5 + row * 1.5), 1.5 + row * 1.2, 0]}>
              <boxGeometry args={[1.5, 1.2, PITCH_W * 2]} />
              <meshStandardMaterial color={row % 2 === 0 ? concrete : "#ccc8c0"} roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[side * (PITCH_L + 15), 5.5, 0]}>
            <boxGeometry args={[0.8, 11, PITCH_W * 2 + 2]} />
            <meshStandardMaterial color={concreteDark} roughness={0.9} />
          </mesh>
          {/* End roof */}
          <mesh position={[side * (PITCH_L + 10), 11.5, 0]}>
            <boxGeometry args={[12, 0.25, PITCH_W * 2 + 2]} />
            <meshStandardMaterial color={steel} roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ── Advertising Boards ── */}
      {[1, -1].map(side => (
        <mesh key={`ad-side-${side}`} position={[0, 0.5, side * (PITCH_W + 1.5)]}>
          <boxGeometry args={[PITCH_L * 2 - 10, 1.0, 0.15]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} />
        </mesh>
      ))}
      {[1, -1].map(side => (
        <mesh key={`ad-end-${side}`} position={[side * (PITCH_L + 1.5), 0.5, 0]}>
          <boxGeometry args={[0.15, 1.0, PITCH_W * 2 - 16]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} />
        </mesh>
      ))}

      {/* ── Dugouts ── */}
      {[1, -1].map(side => (
        <group key={`dugout-${side}`} position={[side * 12, 0, -(PITCH_W + 2.5)]}>
          {/* Roof */}
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[8, 0.15, 2.5]} />
            <meshStandardMaterial color="#333" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Back panel */}
          <mesh position={[0, 1.1, -1.1]}>
            <boxGeometry args={[8, 2.2, 0.1]} />
            <meshStandardMaterial color="#222" transparent opacity={0.7} />
          </mesh>
          {/* Seats */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-3 + i * 1.2, 0.4, -0.3]}>
              <boxGeometry args={[0.5, 0.8, 0.5]} />
              <meshStandardMaterial color="#cc2233" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Corner Flags ── */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <group key={`flag-${i}`} position={[sx * PITCH_L, 0, sz * PITCH_W]}>
          <Cylinder args={[0.03, 0.03, 1.6, 6]} position={[0, 0.8, 0]}>
            <meshStandardMaterial color="#ffcc00" roughness={0.3} />
          </Cylinder>
          {/* Flag triangle */}
          <mesh position={[0.15, 1.45, 0]} rotation={[0, 0, 0.1]}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshStandardMaterial color="#cc2233" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ── Floodlight Towers ── */}
      {[[-58, -48], [58, -48], [-58, 48], [58, 48]].map(([x, z], i) => (
        <group key={`flood-${i}`}>
          {/* Lattice pylon — 3 tapered cylinders */}
          <Cylinder args={[0.25, 0.6, 45, 4]} position={[x, 22.5, z]}>
            <meshStandardMaterial color={steel} metalness={0.8} roughness={0.3} />
          </Cylinder>
          {/* Cross braces */}
          {[10, 20, 30].map(h => (
            <mesh key={h} position={[x, h, z]}>
              <boxGeometry args={[1.5, 0.08, 1.5]} />
              <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Light bank */}
          <mesh position={[x, 45, z]}>
            <boxGeometry args={[4, 2, 3]} />
            <meshStandardMaterial color="#666" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Light panels */}
          {[-1, 0, 1].map(j => (
            <mesh key={j} position={[x + j * 1.2, 45, z + (z > 0 ? -1.6 : 1.6)]}>
              <planeGeometry args={[1, 1.5]} />
              <meshBasicMaterial color="#fffae0" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Press Box (one side, upper tier) ── */}
      <mesh position={[0, 13, -(PITCH_W + 14)]}>
        <boxGeometry args={[20, 2.5, 3]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Press box windows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-7 + i * 2, 13.2, -(PITCH_W + 12.3)]}>
          <planeGeometry args={[1.5, 1.8]} />
          <meshStandardMaterial color="#88bbdd" transparent opacity={0.5} metalness={0.8} roughness={0.1} />
        </mesh>
      ))}

      {/* ── Crowd Figures ── */}
      {crowd.map((c, i) => (
        <CrowdPerson key={i} position={c.pos} shirtColor={c.color} seed={c.seed} />
      ))}
    </group>
  );
}

/* ─── Clean Ball Path — single continuous CatmullRom curve ─── */
function CleanBallPath({ waypoints, teamColor, glowIntensity = 1, currentEventIdx = 0 }: {
  waypoints: BallPathPoint[]; teamColor: string; glowIntensity?: number; currentEventIdx?: number;
}) {
  const ballRef       = useRef<THREE.Mesh>(null);
  const ghostRef      = useRef<THREE.Group>(null);
  const ghostBodyRef  = useRef<THREE.Mesh>(null);
  const ghostHeadRef  = useRef<THREE.Mesh>(null);
  const ghostLegLRef  = useRef<THREE.Mesh>(null);
  const ghostLegRRef  = useRef<THREE.Mesh>(null);
  const ghostOpacity  = useRef(0);
  const trailRefs     = useRef<THREE.Mesh[]>([]);
  const progressRef   = useRef(0);
  const TRAIL_COUNT   = 16;

  const pts3 = useMemo(() =>
    waypoints.map(p => new THREE.Vector3(...toScene(p.x, p.y, p.z))),
    [waypoints]
  );

  const curve = useMemo(() => {
    if (pts3.length < 2) return null;
    return new THREE.CatmullRomCurve3(pts3, false, "catmullrom", 0.5);
  }, [pts3]);

  const trailPoints = useMemo((): [number, number, number][] => {
    if (!curve) return [];
    return curve.getPoints(200).map(p => [p.x, p.y, p.z] as [number, number, number]);
  }, [curve]);

  const segments = useMemo(() => {
    if (!curve || waypoints.length < 2) return [];
    const sampled = curve.getPoints(200);
    const result: { points: [number, number, number][]; type: string }[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const t0 = Math.floor((i / (waypoints.length - 1)) * 200);
      const t1 = Math.ceil(((i + 1) / (waypoints.length - 1)) * 200);
      const segPts = sampled.slice(t0, t1 + 1).map(p => [p.x, p.y, p.z] as [number, number, number]);
      if (segPts.length >= 2) result.push({ points: segPts, type: waypoints[i].type });
    }
    return result;
  }, [curve, waypoints]);

  // Per-segment type array — O(1) lookup in useFrame
  const segmentTypes = useMemo(
    () => waypoints.slice(0, -1).map(p => p.type),
    [waypoints]
  );

  // Per-segment speed multipliers:
  //   pass  → 1.0  (standard)
  //   carry → 0.55 (player jogging, ball at feet)
  //   shot  → 1.8  (driven ball, quick)
  const SPEED_BASE = 0.26;
  const SPEED: Record<string, number> = { pass: 1.0, carry: 0.55, shot: 1.8 };

  useFrame((state, delta) => {
    if (!curve || !ballRef.current) return;

    // Static ball position based on clicked event (no auto-cycling)
    const t = Math.min(currentEventIdx / Math.max(waypoints.length - 1, 1), 0.9999);
    const segIdx = Math.min(Math.floor(t * segmentTypes.length), segmentTypes.length - 1);
    const segType = segmentTypes[segIdx] ?? "pass";
    const isCarry = segType === "carry";
    const isShot  = segType === "shot";

    const pos = curve.getPoint(t);

    // ── Carry / dribble physics ──────────────────────────────
    if (isCarry) {
      pos.y = Math.max(pos.y, 0.08);
      // Fast foot-height bounce: simulates the ball being tapped forward
      pos.y += Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.14;
    }
    // ────────────────────────────────────────────────────────

    ballRef.current.position.copy(pos);
    // Spin: slow roll on carries, fast on passes, very fast on shot
    ballRef.current.rotation.z -= delta * (isCarry ? 3 : isShot ? 20 : 10);

    // ── Ghost player silhouette (appears during carry segments) ─
    ghostOpacity.current += delta * (isCarry ? 4 : -6);
    ghostOpacity.current = Math.max(0, Math.min(0.55, ghostOpacity.current));
    if (ghostRef.current) {
      const op = ghostOpacity.current * glowIntensity;
      ghostRef.current.visible = op > 0.01;
      if (op > 0.01) {
        // Position at ball's ground location, facing direction of travel
        const nextPos = curve.getPoint(Math.min(t + 0.005, 1));
        ghostRef.current.position.set(pos.x, 0, pos.z);
        // Face direction of travel
        const dx = nextPos.x - pos.x;
        const dz = nextPos.z - pos.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.001) {
          ghostRef.current.rotation.y = Math.atan2(dx, dz);
        }
        // Slight body lean forward during run
        ghostRef.current.rotation.x = 0.12;
        // Apply opacity to all ghost meshes
        const mats = [ghostBodyRef, ghostHeadRef, ghostLegLRef, ghostLegRRef];
        for (const mref of mats) {
          if (mref.current) {
            (mref.current.material as THREE.MeshBasicMaterial).opacity = op;
          }
        }
        // Running leg animation — stride
        const stride = Math.sin(state.clock.elapsedTime * 8) * 0.35;
        if (ghostLegLRef.current) ghostLegLRef.current.rotation.x =  stride;
        if (ghostLegRRef.current) ghostLegRRef.current.rotation.x = -stride;
      }
    }
    // ─────────────────────────────────────────────────────────

    // Trail particles — follow behind along the same curve
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const ref = trailRefs.current[i];
      if (!ref) continue;
      const trailT = ((t - (i + 1) * 0.018) + 2) % 1;
      const tp = curve.getPoint(trailT);
      const trailSeg = Math.min(Math.floor(trailT * segmentTypes.length), segmentTypes.length - 1);
      if (segmentTypes[trailSeg] === "carry") tp.y = Math.max(tp.y, 0.08);
      ref.position.copy(tp);
      ref.scale.setScalar(1 - (i / TRAIL_COUNT) * 0.85);
    }
  });

  if (!curve || pts3.length < 2) return null;

  const passColor  = teamColor;
  const carryColor = "#ffcc00";
  const shotColor  = "#ffffff";
  const origin     = pts3[0].toArray() as [number, number, number];

  return (
    <group>
      {/* Faint full-path ghost */}
      <Line points={trailPoints} color={teamColor} lineWidth={1} transparent opacity={0.12 * glowIntensity} />

      {/* Coloured segments */}
      {segments.map((seg, i) =>
        seg.points.length >= 2 && (
          <Line key={i} points={seg.points}
            color={seg.type === "shot" ? shotColor : seg.type === "carry" ? carryColor : passColor}
            lineWidth={seg.type === "shot" ? 4 : seg.type === "carry" ? 2.5 : 3}
            transparent opacity={(seg.type === "shot" ? 0.95 : 0.65) * glowIntensity}
          />
        )
      )}

      {/* Pass node markers */}
      {waypoints.filter(p => p.type === "pass").map((p, i) => {
        const [sx, sy, sz] = toScene(p.x, p.y, p.z);
        return (
          <group key={i}>
            <Sphere args={[0.22, 8, 8]} position={[sx, Math.max(sy, 0.05) + 0.05, sz]}>
              <meshBasicMaterial color={passColor} transparent opacity={0.7 * glowIntensity} />
            </Sphere>
            <mesh position={[sx, 0.02, sz]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.55, 16]} />
              <meshBasicMaterial color={passColor} transparent opacity={0.3 * glowIntensity} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Goal impact light + glow */}
      {pts3.length > 0 && (() => {
        const last = pts3[pts3.length - 1].toArray() as [number, number, number];
        return (
          <>
            <Sphere args={[0.45, 16, 16]} position={last}>
              <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2.5 * glowIntensity} transparent opacity={0.55} />
            </Sphere>
            <pointLight position={last} color={teamColor} intensity={2.5 * glowIntensity} distance={14} />
          </>
        );
      })()}

      {/* ── Ghost player silhouette — appears during carry/dribble segments ── */}
      <group ref={ghostRef} visible={false} position={origin}>
        {/* Legs */}
        <mesh ref={ghostLegLRef} position={[-0.15, 0.5, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.9, 6]} />
          <meshBasicMaterial color={teamColor} transparent opacity={0} />
        </mesh>
        <mesh ref={ghostLegRRef} position={[0.15, 0.5, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.9, 6]} />
          <meshBasicMaterial color={teamColor} transparent opacity={0} />
        </mesh>
        {/* Torso */}
        <mesh ref={ghostBodyRef} position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.8, 8]} />
          <meshBasicMaterial color={teamColor} transparent opacity={0} />
        </mesh>
        {/* Head */}
        <mesh ref={ghostHeadRef} position={[0, 1.85, 0]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color={teamColor} transparent opacity={0} />
        </mesh>
        {/* Foot-level glow ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.55, 16]} />
          <meshBasicMaterial color={carryColor} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* Ball */}
      <Sphere ref={ballRef} args={[0.35, 16, 16]} position={origin}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.8 * glowIntensity} roughness={0.05} metalness={0.2} />
      </Sphere>

      {/* Trail particles */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <Sphere key={i} ref={(el) => { if (el) trailRefs.current[i] = el; }}
          args={[0.18, 8, 8]} position={origin}>
          <meshBasicMaterial color={teamColor} transparent opacity={(0.7 - (i / TRAIL_COUNT) * 0.65) * glowIntensity} />
        </Sphere>
      ))}
    </group>
  );
}

/* ─── Ball Trajectory with particle trail ─── */
function BallTrajectory({ start, end, color, speed, glowIntensity = 1 }: {
  start: [number, number, number]; end: [number, number, number]; color: string; speed: number; glowIntensity?: number;
}) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(
      (start[0] + end[0]) / 2,
      Math.max(start[1], end[1]) + 3,
      (start[2] + end[2]) / 2,
    ),
    new THREE.Vector3(...end),
  );
  const points = curve.getPoints(80);

  const ballRef = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const trailCount = 12;
  const animSpeed = 0.6 + (speed / 200); // faster animation for faster shots

  useFrame((state) => {
    const t = (Math.sin(state.clock.elapsedTime * animSpeed) + 1) / 2;
    if (ballRef.current) {
      const pos = curve.getPoint(t);
      ballRef.current.position.copy(pos);
    }
    // Trail particles follow behind
    trailRefs.current.forEach((ref, i) => {
      if (ref) {
        const trailT = Math.max(0, t - (i + 1) * 0.015);
        const pos = curve.getPoint(trailT);
        ref.position.copy(pos);
        const scale = 1 - (i / trailCount) * 0.8;
        ref.scale.setScalar(scale);
      }
    });
  });

  return (
    <group>
      {/* Glowing trail line */}
      <Line
        points={points.map(p => [p.x, p.y, p.z] as [number, number, number])}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.3}
      />
      {/* Second brighter inner line */}
      <Line
        points={points.map(p => [p.x, p.y, p.z] as [number, number, number])}
        color="white"
        lineWidth={1}
        transparent
        opacity={0.15}
      />

      {/* Trail particles */}
      {Array.from({ length: trailCount }).map((_, i) => (
        <Sphere key={i} ref={(el) => { if (el) trailRefs.current[i] = el; }} args={[0.15, 8, 8]}>
          <meshBasicMaterial color={color} transparent opacity={0.6 - (i / trailCount) * 0.5} />
        </Sphere>
      ))}

      {/* Main ball — bright with emissive */}
      <Sphere ref={ballRef} args={[0.35, 16, 16]}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5 * glowIntensity} roughness={0.1} metalness={0.3} />
      </Sphere>

      {/* Impact point glow at start */}
      <mesh position={start} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2 * glowIntensity} side={THREE.DoubleSide} />
      </mesh>

      {/* Goal impact — bright flash */}
      <Sphere args={[0.4, 16, 16]} position={end}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2 * glowIntensity} />
      </Sphere>
      <pointLight position={end} color={color} intensity={2 * glowIntensity} distance={8 + glowIntensity * 4} />
    </group>
  );
}

/* ─── Replay Player — smoothly interpolates between positions ─── */
function ReplayPlayer({ currentPos, targetPos, color, name, jersey, isActive, isRecipient }: {
  currentPos: [number, number, number]; targetPos: [number, number, number];
  color: string; name: string; jersey: number;
  isActive: boolean; isRecipient: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...currentPos));

  useFrame((_, delta) => {
    if (ref.current) {
      // Smooth lerp — all players move, active ones faster
      const speed = isActive || isRecipient ? 6 : 4;
      posRef.current.lerp(new THREE.Vector3(...targetPos), delta * speed);
      ref.current.position.copy(posRef.current);
    }
  });

  return (
    <group ref={ref} position={currentPos}>
      {/* Body */}
      <Cylinder args={[0.22, 0.25, 1.4, 8]} position={[0, 0.7, 0]}>
        <meshStandardMaterial color={color} emissive={color}
          emissiveIntensity={isActive ? 0.5 : (isRecipient ? 0.3 : 0.05)}
          roughness={0.4} metalness={0.5} />
      </Cylinder>
      {/* Head */}
      <Sphere args={[0.15, 8, 8]} position={[0, 1.55, 0]}>
        <meshStandardMaterial color="#e8b88a" roughness={0.6} />
      </Sphere>

      {/* Label */}
      <group position={[0, 2.0, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.6, 0.4]} />
          <meshBasicMaterial
            color={isActive ? "white" : (isRecipient ? "#ffff44" : color)}
            transparent opacity={isActive ? 0.95 : (isRecipient ? 0.85 : 0.5)}
            side={THREE.DoubleSide} />
        </mesh>
        <Text position={[-0.5, 0, 0]} fontSize={0.25}
          color={isActive || isRecipient ? "black" : "white"}
          anchorX="center" anchorY="middle" fontWeight="bold">
          {`${jersey}`}
        </Text>
        <Text position={[0.15, 0, 0]} fontSize={0.18}
          color={isActive || isRecipient ? "black" : "white"}
          anchorX="center" anchorY="middle">
          {name}
        </Text>
      </group>

      {/* Active player glow */}
      {isActive && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.8, 1.2, 16]} />
            <meshBasicMaterial color="white" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 2, 0]} color={color} intensity={0.5} distance={5} />
        </>
      )}
      {/* Recipient — waiting for the ball */}
      {isRecipient && !isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.6, 0.9, 16]} />
          <meshBasicMaterial color="#ffff44" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* ─── Test Animation (backup of original Replay) ─── */
function TestAnimation({ events, scoringTeamId, glowIntensity, isPlaying, playbackSpeed, onEventChange }: {
  events: BuildupEvent[]; scoringTeamId: number; glowIntensity: number;
  isPlaying: boolean; playbackSpeed: number; onEventChange: (idx: number) => void;
}) {
  const ballRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const initialised = useRef(false);

  // Reset on events change
  useEffect(() => { progressRef.current = 0; setCurrentEventIdx(0); initialised.current = false; }, [events]);

  const actionEvents = events.filter(e =>
    ["pass", "carry", "dribble", "shot", "goal", "ball-recovery", "tackle", "block", "clearance", "interception"].includes(e.type)
  );

  // Pre-compute the full ball path — one continuous journey, no gaps
  const ballPath = useMemo(() => {
    const path: { x: number; y: number; z: number }[] = [];
    const pointsPerEvent = 30; // smooth curve per event

    for (let ei = 0; ei < actionEvents.length; ei++) {
      const ev = actionEvents[ei];
      const sz = ev.startZ || 0.15;
      const ez = ev.type === "goal" ? (ev.endZ || 1.5) : (ev.endZ || 0.15);
      const start = toScene(ev.startX, ev.startY, sz);
      const end = toScene(ev.endX, ev.endY, ez);

      // Arc height
      let arc = 0.1;
      if (ev.type === "pass") {
        if (ev.passHeight === "high") arc = 4;
        else if (ev.passHeight === "low") arc = 1;
        else arc = 0.2;
      } else if (ev.type === "clearance") arc = 5;
      else if (ev.type === "goal") arc = Math.max(1, ez);
      else if (ev.bodyPart === "head") arc = 2.5;
      else if (ev.type === "carry" || ev.type === "dribble") arc = 0.05;

      for (let p = 0; p < pointsPerEvent; p++) {
        const t = p / (pointsPerEvent - 1);
        // Smoothstep for passes, linear for carries
        const easeT = (ev.type === "carry" || ev.type === "dribble")
          ? t : t * t * (3 - 2 * t);
        path.push({
          x: start[0] + (end[0] - start[0]) * easeT,
          y: start[1] + (end[1] - start[1]) * easeT + Math.sin(easeT * Math.PI) * arc,
          z: start[2] + (end[2] - start[2]) * easeT,
        });
      }
    }
    return path;
  }, [actionEvents]);

  useFrame((_, delta) => {
    if (ballPath.length === 0) return;

    // Initialise ball
    if (!initialised.current && ballRef.current) {
      const p = ballPath[0];
      ballRef.current.position.set(p.x, p.y, p.z);
      initialised.current = true;
    }

    if (!isPlaying) return;

    progressRef.current += delta * playbackSpeed;
    const totalDuration = actionEvents.length * 1.5;
    const clampedT = Math.min(progressRef.current, totalDuration - 0.01);
    const progress = clampedT / totalDuration; // 0 to 1

    // Map progress to ball path index
    const pathIdx = Math.min(Math.floor(progress * ballPath.length), ballPath.length - 1);
    const p = ballPath[pathIdx];

    if (ballRef.current) {
      ballRef.current.position.set(p.x, p.y, p.z);
    }

    // Update event index for UI
    const eventIdx = Math.min(Math.floor(progress * actionEvents.length), actionEvents.length - 1);
    if (eventIdx !== currentEventIdx) {
      setCurrentEventIdx(eventIdx);
      onEventChange(eventIdx);
    }
  });

  if (actionEvents.length === 0) return null;

  const currentEvent = actionEvents[currentEventIdx] || actionEvents[0];
  const teamColor = currentEvent.teamId === scoringTeamId ? "#ff2244" : "#2266ff";

  // Get player positions for current event
  const positions = currentEvent.playerPositions || [];

  return (
    <group>
      {/* All players from snapshot — smoothly interpolating */}
      {positions.map((p, i) => {
        const color = p.teamId === scoringTeamId ? "#ff2244" : "#2266ff";
        const pos = toScene(p.x, p.y, 0);

        // Look ahead for next known position of this player
        const nextEvent = actionEvents[Math.min(currentEventIdx + 1, actionEvents.length - 1)];
        const nextPositions = nextEvent?.playerPositions || [];
        const nextP = nextPositions.find(np => np.id === p.id);
        const targetPos = nextP ? toScene(nextP.x, nextP.y, 0) : pos;

        return (
          <ReplayPlayer
            key={`${p.id}-${p.teamId}`}
            currentPos={pos}
            targetPos={targetPos as [number, number, number]}
            color={color}
            name={p.name}
            jersey={p.jersey}
            isActive={p.isActive}
            isRecipient={p.isRecipient}
          />
        );
      })}

      {/* Completed event lines (trail) */}
      {actionEvents.slice(0, currentEventIdx).map((ev, i) => {
        if (!["pass", "carry", "goal", "dribble", "clearance"].includes(ev.type)) return null;
        const startZ = ev.startZ || 0.05;
        const endZ = ev.type === "goal" ? (ev.endZ || 1.5) : (ev.endZ || 0.05);
        const start = toScene(ev.startX, ev.startY, startZ);
        const end = toScene(ev.endX, ev.endY, endZ);
        const isGoal = ev.type === "goal";
        const isKeyPass = ev.keyPass;
        const recency = 1 - ((currentEventIdx - i) / Math.max(currentEventIdx, 1));

        // High passes get an arced trail
        let points: [number, number, number][] = [start, end];
        if (ev.passHeight === "high" || ev.type === "clearance") {
          const mid: [number, number, number] = [
            (start[0] + end[0]) / 2,
            Math.max(start[1], end[1]) + (ev.passHeight === "high" ? 4 : 5),
            (start[2] + end[2]) / 2,
          ];
          // Simple 3-point arc
          const arcPts: [number, number, number][] = [];
          for (let t = 0; t <= 10; t++) {
            const p = t / 10;
            const x = start[0] * (1-p)*(1-p) + 2 * mid[0] * (1-p) * p + end[0] * p * p;
            const y = start[1] * (1-p)*(1-p) + 2 * mid[1] * (1-p) * p + end[1] * p * p;
            const z = start[2] * (1-p)*(1-p) + 2 * mid[2] * (1-p) * p + end[2] * p * p;
            arcPts.push([x, y, z]);
          }
          points = arcPts;
        }

        const lineColor = isGoal ? "white" : isKeyPass ? "#ffff44" : (ev.teamId === scoringTeamId ? "#ff4466" : "#4466ff");

        return (
          <group key={i}>
            <Line points={points}
              color={lineColor}
              lineWidth={isGoal ? 3 : (isKeyPass ? 2.5 : 1.5)}
              transparent opacity={Math.max(0.05, recency * 0.4 * glowIntensity)}
            />
            {/* Key pass marker */}
            {isKeyPass && (
              <Sphere args={[0.25, 6, 6]} position={start}>
                <meshBasicMaterial color="#ffff44" transparent opacity={0.5 * glowIntensity} />
              </Sphere>
            )}
          </group>
        );
      })}

      {/* Ball trail — the full pre-computed path */}
      {ballPath.length > 1 && (
        <Line
          points={ballPath.map(p => [p.x, p.y, p.z] as [number, number, number])}
          color={scoringTeamId === 1557 ? "#ff4466" : "#4466ff"}
          lineWidth={1.5}
          transparent
          opacity={0.15 * glowIntensity}
        />
      )}

      {/* Ball — ALWAYS visible */}
      <Sphere ref={ballRef} args={[0.3, 16, 16]}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5 * glowIntensity} roughness={0.1} metalness={0.3} />
      </Sphere>
    </group>
  );
}

/* ─── Full Replay — WORKING ball path + simple players ─── */
function BuildupAnimation({ events, scoringTeamId, glowIntensity, isPlaying, playbackSpeed, onEventChange }: {
  events: BuildupEvent[]; scoringTeamId: number; glowIntensity: number;
  isPlaying: boolean; playbackSpeed: number; onEventChange: (idx: number) => void;
}) {
  const ballRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);

  // Reset on events change
  useEffect(() => { progressRef.current = 0; setCurrentEventIdx(0); }, [events]);

  const actionEvents = events.filter(e =>
    ["pass", "carry", "dribble", "shot", "goal", "ball-recovery", "tackle", "block", "clearance", "interception"].includes(e.type)
  );

  // Build waypoints from events (same as WORKING Ball Path mode)
  const waypoints = useMemo(() => {
    const pts: { x: number; y: number; z: number; type: string }[] = [];
    for (const ev of actionEvents) {
      const sz = ev.startZ || 0.15;
      const ez = ev.type === "goal" ? (ev.endZ || 1.5) : (ev.endZ || 0.15);
      pts.push({ x: ev.startX, y: ev.startY, z: sz, type: ev.type });
      pts.push({ x: ev.endX, y: ev.endY, z: ez, type: ev.type });
    }
    return pts;
  }, [actionEvents]);

  // CatmullRom curve (SAME AS Ball Path mode - this is the WORKING code)
  const pts3 = useMemo(() =>
    waypoints.map(p => new THREE.Vector3(...toScene(p.x, p.y, p.z))),
    [waypoints]
  );

  const curve = useMemo(() => {
    if (pts3.length < 2) return null;
    return new THREE.CatmullRomCurve3(pts3, false, "catmullrom", 0.5);
  }, [pts3]);

  // Full ball trail path (200 points for smooth visualization)
  const trailPoints = useMemo((): [number, number, number][] => {
    if (!curve) return [];
    return curve.getPoints(200).map(p => [p.x, p.y, p.z] as [number, number, number]);
  }, [curve]);

  useFrame((_, delta) => {
    if (!curve || !ballRef.current) return;
    if (!isPlaying) return;

    // SLOWER: 0.1 instead of 0.26 (real-time feel)
    progressRef.current += delta * playbackSpeed * 0.1; 
    const t = Math.min(progressRef.current, 0.9999);
    const pos = curve.getPointAt(t);

    ballRef.current.position.copy(pos);

    // Update event index for UI
    const eventIdx = Math.min(Math.floor(t * actionEvents.length), actionEvents.length - 1);
    if (eventIdx !== currentEventIdx) {
      setCurrentEventIdx(eventIdx);
      onEventChange(eventIdx);
    }
  });

  if (actionEvents.length === 0 || !curve) return null;

  const currentEvent = actionEvents[currentEventIdx] || actionEvents[0];
  const teamColor = currentEvent.teamId === scoringTeamId ? "#ff2244" : "#2266ff";

  // Get player positions for current event
  const positions = currentEvent.playerPositions || [];
  
  // Add player at ball position if not already there (passer/active player)
  const ballPos = toScene(currentEvent.startX, currentEvent.startY, 0);
  const activePresentAtBall = positions.some(p => p.isActive && 
    Math.abs(p.x - currentEvent.startX) < 2 && Math.abs(p.y - currentEvent.startY) < 2
  );
  
  // Team-based drift direction (toward attacking goal)
  // Wrexham (scoring team) attacks toward +X, opponents toward -X
  const attackingDirection = scoringTeamId === WREXHAM_ID ? 1 : -1;

  return (
    <group>
      {/* Add passer at ball position if missing */}
      {!activePresentAtBall && currentEvent.playerName && (
        <ReplayPlayer
          key={`passer-${currentEventIdx}`}
          currentPos={ballPos}
          targetPos={ballPos}
          color={teamColor}
          name={currentEvent.playerName}
          jersey={99}
          isActive={true}
          isRecipient={false}
        />
      )}
      
      {/* All players — drift toward ball + attacking goal */}
      {positions.map((p, i) => {
        const color = p.teamId === scoringTeamId ? "#ff2244" : "#2266ff";
        const pos = toScene(p.x, p.y, 0);
        
        // Team drift: red toward +X, blue toward -X
        const teamDrift = p.teamId === WREXHAM_ID ? 1 : -1;

        // Look ahead for next known position of this player
        const nextEvent = actionEvents[Math.min(currentEventIdx + 1, actionEvents.length - 1)];
        const nextPositions = nextEvent?.playerPositions || [];
        const nextP = nextPositions.find(np => np.id === p.id);
        
        // Calculate target: nudge active/recipient toward ball + team drift
        let targetPos: [number, number, number];
        if (!nextP) {
          // No next position - subtle drift toward attacking goal
          targetPos = [pos[0] + teamDrift * 0.3, pos[1], pos[2]] as [number, number, number];
        } else if (p.isRecipient) {
          // Recipient drifts toward ball end + attacking goal
          const nextPos = toScene(nextP.x, nextP.y, 0);
          const ballEnd = toScene(currentEvent.endX, currentEvent.endY, 0);
          targetPos = [
            nextPos[0] * 0.7 + ballEnd[0] * 0.3 + teamDrift * 0.2,
            nextPos[1] * 0.7 + ballEnd[1] * 0.3,
            nextPos[2]
          ] as [number, number, number];
        } else {
          // Others move to next position + subtle team drift
          const nextPos = toScene(nextP.x, nextP.y, 0);
          targetPos = [
            nextPos[0] + teamDrift * 0.15,
            nextPos[1],
            nextPos[2]
          ] as [number, number, number];
        }

        return (
          <ReplayPlayer
            key={`${p.id}-${p.teamId}`}
            currentPos={pos}
            targetPos={targetPos}
            color={color}
            name={p.name}
            jersey={p.jersey}
            isActive={p.isActive}
            isRecipient={p.isRecipient}
          />
        );
      })}

      {/* Ball trail path (full smooth line like Ball Path mode) */}
      {trailPoints.length > 1 && (
        <Line
          points={trailPoints}
          color={teamColor}
          lineWidth={2}
          transparent
          opacity={0.3 * glowIntensity}
        />
      )}

      {/* Ball — simple visible sphere */}
      <Sphere ref={ballRef} args={[0.4, 16, 16]}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2.0 * glowIntensity} roughness={0.1} metalness={0.3} />
      </Sphere>
    </group>
  );
}

/* ─── Goal Scene ─── */
function GoalScene({ goal, selectedPlayer, onSelectPlayer, trailGlow, showBuildup, showBallPath, showRawData, showGoalMoment, showApiFixTest, showBpDataOnly, showRawReal, showHollywood, rawDataMode, visibleWaypoints, ballEventIdx, buildupDepth, cameraLocked, playbackSpeed, onReplayEvent }: {
  goal: Goal; selectedPlayer: number | null; onSelectPlayer: (idx: number | null) => void;
  trailGlow: number; showBuildup: boolean; showBallPath: boolean; showRawData: boolean; showGoalMoment: boolean; showApiFixTest: boolean; showBpDataOnly: boolean; showRawReal: boolean; showHollywood: boolean; rawDataMode: "sparse" | "all"; visibleWaypoints: BallPathPoint[]; ballEventIdx: number; buildupDepth: number; cameraLocked: boolean; playbackSpeed: number; onReplayEvent: (idx: number) => void;
}) {
  const isWrexham = goal.teamId === WREXHAM_ID;
  const teamColor = isWrexham ? "#ff2244" : "#2266ff";
  const opponentColor = isWrexham ? "#2266ff" : "#ff2244";

  const shotStart = toScene(goal.startX, goal.startY, goal.startZ);
  const shotEnd = toScene(goal.endX || 120, goal.endY || 40, goal.endZ || 0);

  return (
    <group>
      <Pitch />
      <Stadium />

      {/* Camera controller — flies to overview when ball path mode is on */}
      <BallPathCamera
        waypoints={goal.ballPath ?? []}
        active={showBallPath}
        cameraLocked={cameraLocked}
        fallbackTarget={shotStart}
      />

      {/* === RAW DATA MODE — animated data points appearing over time === */}
      {showRawData && goal.ballPath && goal.ballPath.length > 0 && (
        <AnimatedRawData 
          ballPath={goal.ballPath} 
          mode={rawDataMode}
          isPlaying={showRawData}
          playbackSpeed={playbackSpeed}
        />
      )}

      {/* === BALL PATH MODE — clean continuous spline, no players === */}
      {showBallPath && visibleWaypoints && visibleWaypoints.length >= 2 && (
        <CleanBallPath
          waypoints={visibleWaypoints}
          teamColor={teamColor}
          glowIntensity={trailGlow}
          currentEventIdx={ballEventIdx}
        />
      )}

      {/* === REPLAY MODE — chronological events with all players (IMPROVED) === */}
      {showBuildup && goal.buildup && (
        <BuildupAnimation
          events={goal.buildup}
          scoringTeamId={goal.teamId}
          glowIntensity={trailGlow}
          isPlaying={showBuildup}
          playbackSpeed={playbackSpeed}
          onEventChange={onReplayEvent}
        />
      )}

      {/* === TEST MODE: API FIX — same as Replay but use slider to test different depths === */}
      {showApiFixTest && goal.buildup && (
        <>
          <Text position={[0, 15, 0]} fontSize={2} color="#ff9900" anchorX="center" anchorY="middle">
            🔧 API Fix Test (depth={buildupDepth}) - use slider!
          </Text>
          <BuildupAnimation
            events={goal.buildup}
            scoringTeamId={goal.teamId}
            glowIntensity={trailGlow}
            isPlaying={showApiFixTest}
            playbackSpeed={playbackSpeed}
            onEventChange={onReplayEvent}
          />
        </>
      )}

      {/* === TEST MODE: BP DATA ONLY — converting ballPath to fake buildup === */}
      {showBpDataOnly && goal.ballPath && (
        <>
          <Text position={[0, 15, 0]} fontSize={2} color="#00ddff" anchorX="center" anchorY="middle">
            📊 BP Data Only Test
          </Text>
          {/* Ball trail using ballPath */}
          {goal.ballPath.length > 1 && (() => {
            const pts3 = goal.ballPath.map(p => new THREE.Vector3(...toScene(p.x, p.y, p.z)));
            const curve = new THREE.CatmullRomCurve3(pts3, false, "catmullrom", 0.5);
            const trailPts = curve.getPoints(200).map(p => [p.x, p.y, p.z] as [number, number, number]);
            return (
              <Line
                points={trailPts}
                color={teamColor}
                lineWidth={2}
                transparent
                opacity={0.5 * trailGlow}
              />
            );
          })()}
        </>
      )}

      {/* === 🔴 THE REALITY — Full possession chain (ballPath dataset) === */}
      {showRawReal && goal.ballPath && goal.ballPath.length > 1 && (
        <>
          <Text position={[0, 20, 0]} fontSize={3} color="#ff4444" anchorX="center" anchorY="middle" font-weight="bold">
            🔴 THE REALITY
          </Text>
          <Text position={[0, 17, 0]} fontSize={1.2} color="#ffaaaa" anchorX="center" anchorY="middle">
            Full possession chain • All teams • ballPath dataset
          </Text>
          {/* Ball trail - FULL path including opponent possessions */}
          {(() => {
            const pts3 = goal.ballPath.map(p => new THREE.Vector3(...toScene(p.x, p.y, p.z)));
            const curve = new THREE.CatmullRomCurve3(pts3, false, "catmullrom", 0.5);
            const trailPts = curve.getPoints(300).map(p => [p.x, p.y, p.z] as [number, number, number]);
            return (
              <>
                <Line
                  points={trailPts}
                  color="#ff6666"
                  lineWidth={3}
                  transparent
                  opacity={0.6 * trailGlow}
                />
                {/* Show waypoints as dots to emphasize the data points */}
                {goal.ballPath.filter((p, i) => i % 3 === 0).map((p, idx) => {
                  const [x, y, z] = toScene(p.x, p.y, p.z);
                  return (
                    <Sphere key={idx} args={[0.3, 8, 8]} position={[x, y + 0.2, z]}>
                      <meshBasicMaterial color="#ff4444" transparent opacity={0.5} />
                    </Sphere>
                  );
                })}
              </>
            );
          })()}
        </>
      )}

      {/* === 🎬 THE HOLLYWOOD — Clean final attack (buildup filtered to scoring team) === */}
      {showHollywood && goal.buildup && (
        <>
          <Text position={[0, 20, 0]} fontSize={3} color="#44ff44" anchorX="center" anchorY="middle" font-weight="bold">
            🎬 THE HOLLYWOOD
          </Text>
          <Text position={[0, 17, 0]} fontSize={1.2} color="#aaffaa" anchorX="center" anchorY="middle">
            Clean final attack • Scoring team only • buildup filtered
          </Text>
          {/* Only show scoring team events */}
          {(() => {
            const scoringTeamEvents = goal.buildup.filter(e => e.teamId === goal.teamId);
            if (scoringTeamEvents.length < 2) return null;
            
            // Build smooth path from scoring team events only
            const pts: THREE.Vector3[] = [];
            scoringTeamEvents.forEach(e => {
              pts.push(new THREE.Vector3(...toScene(e.startX, e.startY, e.startZ || 0)));
              pts.push(new THREE.Vector3(...toScene(e.endX, e.endY, e.endZ || 0)));
            });
            
            if (pts.length < 2) return null;
            const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
            const trailPts = curve.getPoints(200).map(p => [p.x, p.y, p.z] as [number, number, number]);
            
            return (
              <>
                <Line
                  points={trailPts}
                  color="#44ff44"
                  lineWidth={4}
                  transparent
                  opacity={0.8 * trailGlow}
                />
                {/* Event markers */}
                {scoringTeamEvents.map((e, idx) => {
                  const [x, y, z] = toScene(e.startX, e.startY, e.startZ || 0);
                  return (
                    <Sphere key={idx} args={[0.4, 12, 12]} position={[x, y + 0.3, z]}>
                      <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={0.8} />
                    </Sphere>
                  );
                })}
              </>
            );
          })()}
        </>
      )}

      {/* === GOAL MOMENT MODE — freeze frame snapshot at moment of goal === */}
      {showGoalMoment && (
        <>
          {/* Freeze frame players */}
          {goal.freezeFrame.map((p, i) => {
            const pos = toScene(p.x, p.y, 0);
            const col = p.goalkeeper ? "#88cc00" : (p.teammate ? teamColor : opponentColor);
            return (
              <PlayerFigure
                key={i}
                position={pos}
                color={col}
                isGoalkeeper={p.goalkeeper}
                isShooter={false}
                playerIndex={goal.index * 100 + i}
                label={p.playerName}
                jersey={p.jersey}
                onSelect={() => onSelectPlayer(selectedPlayer === i ? null : i)}
                isSelected={selectedPlayer === i}
              />
            );
          })}

          {/* Shooter */}
          <PlayerFigure
            position={shotStart}
            color={teamColor}
            isGoalkeeper={false}
            isShooter={true}
            playerIndex={goal.index * 100 + 99}
            label={goal.player.split(" ").pop()}
            jersey={goal.playerData?.jersey}
            onSelect={() => onSelectPlayer(-1)}
            isSelected={selectedPlayer === -1}
          />

          {/* Ball trajectory arc */}
          <BallTrajectory start={shotStart} end={shotEnd} color={teamColor} speed={goal.speedKmh} glowIntensity={trailGlow} />

          {/* xG text floating above shooter */}
          <Text
            position={[shotStart[0], shotStart[1] + 4, shotStart[2]]}
            fontSize={1.5}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {`xG: ${goal.xg.toFixed(2)}`}
          </Text>

          {/* Speed text */}
          <Text
            position={[(shotStart[0] + shotEnd[0]) / 2, Math.max(shotStart[1], shotEnd[1]) + 5, (shotStart[2] + shotEnd[2]) / 2]}
            fontSize={1.2}
            color={goal.speedKmh > 80 ? "#ff4444" : "#44ff44"}
            anchorX="center"
            anchorY="middle"
          >
            {`${goal.speedKmh}km/h`}
          </Text>
        </>
      )}

      {/* Daytime lighting */}
      <ambientLight intensity={0.6} color="#e8eeff" />
      {/* Sun — warm directional */}
      <directionalLight position={[60, 80, -40]} intensity={1.8} castShadow color="#fff5e0"
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={60} shadow-camera-bottom={-60} />
      {/* Fill light — cool blue from opposite side */}
      <directionalLight position={[-40, 40, 30]} intensity={0.4} color="#aaccff" />
      {/* Bounce light from pitch */}
      <directionalLight position={[0, -5, 0]} intensity={0.15} color="#88cc88" />
      {/* Subtle team-colour accent on shooter */}
      <pointLight position={[shotStart[0], 6, shotStart[2]]} intensity={0.4} color={teamColor} distance={15} />
    </group>
  );
}

/* ─── Event Stepper — manual step through ball path events ─── */
function EventStepper({ events, currentIdx, onSelect }: {
  events: { type: string; startIdx: number; endIdx: number }[];
  currentIdx: number;
  onSelect: (i: number) => void;
}) {
  if (!events?.length) return null;
  const ev = events[currentIdx];
  const label = ev.type === "shot" ? "Shot ⚽" : ev.type === "pass" ? "Pass" : ev.type === "carry" ? "Carry" : ev.type;
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-5 py-3 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 text-white select-none shadow-lg">
      <button onClick={() => onSelect(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition text-lg font-bold">←</button>
      <div className="min-w-[120px] text-center">
        <span className="font-semibold text-sm tracking-wide">{label}</span>
      </div>
      <span className="text-gray-500 text-xs tabular-nums">{currentIdx + 1}/{events.length}</span>
      <button onClick={() => onSelect(Math.min(events.length - 1, currentIdx + 1))} disabled={currentIdx === events.length - 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition text-lg font-bold">→</button>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Viewer360Page() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [trailGlow, setTrailGlow] = useState(1.0);
  const [viewMode, setViewMode] = useState<"raw" | "path" | "replay" | "goal" | "apifix" | "bpdata" | "rawreal" | "hollywood">("goal");
  const [rawDataMode, setRawDataMode] = useState<"sparse" | "all">("all");
  const [cameraLocked, setCameraLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.2);
  const [currentReplayEvent, setCurrentReplayEvent] = useState(0);
  const [ballEventIdx, setBallEventIdx] = useState(0);
  const [buildupDepth, setBuildupDepth] = useState(12);
  const [loading, setLoading] = useState(true);
  
  // Derived state for backward compatibility
  const showBuildup = viewMode === "replay";
  const showBallPath = viewMode === "path";
  const showRawData = viewMode === "raw";
  const showGoalMoment = viewMode === "goal";
  const showApiFixTest = viewMode === "apifix";
  const showBpDataOnly = viewMode === "bpdata";
  const showRawReal = viewMode === "rawreal";
  const showHollywood = viewMode === "hollywood";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wrexham/match-data?matchId=1377475&maxChain=${buildupDepth}`)
      .then(r => r.json())
      .then(data => {
        setGoals(data.goals || []);
        setBallEventIdx(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [buildupDepth]);

  // Reset modes when goal changes
  useEffect(() => { setSelectedPlayer(null); setViewMode("goal"); setCameraLocked(false); setCurrentReplayEvent(0); setBallEventIdx(0); }, [selectedGoal]);

  // Derive ball path events from eventIndex — each pass, carry, and shot is its own step
  const ballEvents = useMemo(() => {
    const bp = goals[selectedGoal]?.ballPath;
    if (!bp?.length) return [];
    // Group waypoints by their eventIndex (each chain event = one step)
    const eventMap = new Map<number, { type: string; startIdx: number; endIdx: number }>();
    for (let i = 0; i < bp.length; i++) {
      const eIdx = bp[i].eventIndex ?? 0;
      if (!eventMap.has(eIdx)) {
        eventMap.set(eIdx, { type: bp[i].type, startIdx: i, endIdx: i });
      } else {
        eventMap.get(eIdx)!.endIdx = i;
      }
    }
    // Sort by eventIndex (keys are ordered but carries use fractional indices)
    return Array.from(eventMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }, [goals, selectedGoal]);

  // Waypoints sliced to current event
  const visibleWaypoints = useMemo(() => {
    const bp = goals[selectedGoal]?.ballPath;
    if (!bp?.length || !ballEvents.length) return bp ?? [];
    if (!showBallPath) return bp;
    const endIdx = ballEvents[Math.min(ballEventIdx, ballEvents.length - 1)]?.endIdx ?? bp.length - 1;
    return bp.slice(0, endIdx + 1);
  }, [goals, selectedGoal, ballEvents, ballEventIdx, showBallPath]);

  // Keyboard nav for ball path events
  useEffect(() => {
    if (!showBallPath || !ballEvents.length) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setBallEventIdx(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setBallEventIdx(i => Math.min(ballEvents.length - 1, i + 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showBallPath, ballEvents.length]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading 3D scene...</div>;

  const goal = goals[selectedGoal];
  if (!goal) return <div className="min-h-screen bg-black flex items-center justify-center text-white">No goals found</div>;

  const isWrexham = goal.teamId === WREXHAM_ID;

  // Selected player info
  const selectedPlayerInfo = selectedPlayer !== null
    ? selectedPlayer === -1
      ? { name: goal.player, jersey: goal.playerData?.jersey, role: "⚽ Goalscorer", team: goal.team, isShooter: true }
      : goal.freezeFrame[selectedPlayer]
        ? { name: goal.freezeFrame[selectedPlayer].playerName, jersey: goal.freezeFrame[selectedPlayer].jersey,
            role: goal.freezeFrame[selectedPlayer].goalkeeper ? "🧤 Goalkeeper" : (goal.freezeFrame[selectedPlayer].teammate ? "🤝 Teammate" : "🛡️ Defender"),
            team: goal.freezeFrame[selectedPlayer].teammate ? goal.team : (isWrexham ? "Ipswich Town" : "Wrexham"),
            isShooter: false }
        : null
    : null;

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b border-white/10 bg-black/80 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🌐 360° Goal Viewer</h1>
            <p className="text-sm text-gray-400">Drag to orbit · Scroll to zoom · Click player for info</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${isWrexham ? "text-red-400" : "text-blue-400"}`}>
              ⚽ {goal.player} {goal.minute}&apos;
            </span>
            <span className="text-sm text-gray-400">
              {goal.speedKmh}km/h · xG {goal.xg.toFixed(2)} · {goal.bodyPart}
            </span>
          </div>
        </div>
      </div>

      {/* Goal selector */}
      <div className="shrink-0 px-6 py-2 flex gap-2 overflow-x-auto bg-black/60">
        {goals.map((g, i) => (
          <button key={i} onClick={() => setSelectedGoal(i)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition ${
              selectedGoal === i
                ? (g.teamId === WREXHAM_ID ? "border-red-400 bg-red-400/10 text-red-300" : "border-blue-400 bg-blue-400/10 text-blue-300")
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
            }`}>
            {g.minute}&apos; {g.player.split(" ").pop()} · {g.speedKmh}km/h
          </button>
        ))}
      </div>

      {/* 3D Canvas + Player Info overlay */}
      <div className="flex-1 relative">
        <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
          <PerspectiveCamera makeDefault position={(() => {
            // Camera high up WAY behind stadium (dramatic fog zoom-in)
            const goalScoredAtX = goal.endX || 120;
            const cameraX = goalScoredAtX > 60 ? -120 : 120; // Way outside stadium
            const cameraY = 50; // Up in the clouds
            const cameraZ = 0; // Centered on pitch width
            return [cameraX, cameraY, cameraZ] as [number, number, number];
          })()} fov={50} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={300}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 0, 0] as unknown as THREE.Vector3}
          />
          <fog attach="fog" args={["#b8d8f0", 100, 200]} />
          <Suspense fallback={null}>
            <Sky />
            <GoalScene goal={goal} selectedPlayer={selectedPlayer} onSelectPlayer={setSelectedPlayer}
              trailGlow={trailGlow} showBuildup={showBuildup} showBallPath={showBallPath}
              showRawData={showRawData} showGoalMoment={showGoalMoment} 
              showApiFixTest={showApiFixTest} showBpDataOnly={showBpDataOnly}
              showRawReal={showRawReal} showHollywood={showHollywood}
              rawDataMode={rawDataMode}
              visibleWaypoints={visibleWaypoints} ballEventIdx={ballEventIdx}
              buildupDepth={buildupDepth}
              cameraLocked={cameraLocked} playbackSpeed={playbackSpeed} onReplayEvent={setCurrentReplayEvent} />
          </Suspense>
          <EffectComposer>
            <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={0.3} />
            <Vignette eskil={false} offset={0.15} darkness={0.4} />
          </EffectComposer>
        </Canvas>

        {/* Event Stepper — ball path mode */}
        {showBallPath && ballEvents.length > 0 && (
          <EventStepper events={ballEvents} currentIdx={ballEventIdx} onSelect={setBallEventIdx} />
        )}

        {/* Controls panel — top right */}
        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/15 rounded-xl p-3 w-[220px] space-y-3 shadow-2xl">
          {/* Trail Glow slider */}
          <div>
            <label className="text-[11px] text-gray-400 flex justify-between mb-1">
              <span>✨ Trail Glow</span>
              <span className="text-white">{Math.round(trailGlow * 100)}%</span>
            </label>
            <input type="range" min="0" max="3" step="0.05" value={trailGlow}
              onChange={e => setTrailGlow(parseFloat(e.target.value))}
              className="w-full h-1.5 appearance-none bg-gray-700 rounded-full cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Mode controls */}
          <div className="border-t border-white/10 pt-2 space-y-1.5">
            <div className="text-[11px] text-gray-400 mb-1.5 font-semibold">🎬 View Mode</div>

            {/* 4-mode selector (2x2 grid) */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setViewMode("raw")}
                className={`text-[10px] rounded-lg border px-2 py-2 transition font-semibold ${
                  viewMode === "raw"
                    ? "border-red-400 bg-red-400/15 text-red-300"
                    : "border-white/15 text-gray-400 hover:border-white/30"
                }`}>
                🔴 Raw Data
              </button>
              <button
                onClick={() => { setViewMode("path"); setBallEventIdx(0); }}
                className={`text-[10px] rounded-lg border px-2 py-2 transition font-semibold ${
                  viewMode === "path"
                    ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                    : "border-white/15 text-gray-400 hover:border-white/30"
                }`}>
                🟡 Ball Path
              </button>
              <button
                onClick={() => setViewMode("goal")}
                className={`text-[10px] rounded-lg border px-2 py-2 transition font-semibold ${
                  viewMode === "goal"
                    ? "border-purple-400 bg-purple-400/15 text-purple-300"
                    : "border-white/15 text-gray-400 hover:border-white/30"
                }`}>
                🟣 Goal Moment
              </button>
              <button
                onClick={() => setViewMode("replay")}
                className={`text-[10px] rounded-lg border px-2 py-2 transition font-semibold ${
                  viewMode === "replay"
                    ? "border-green-400 bg-green-400/15 text-green-300"
                    : "border-white/15 text-gray-400 hover:border-white/30"
                }`}>
                🟢 Replay
              </button>
            </div>

            {/* DEMO COMPARISON MODES */}
            <div className="text-[9px] text-yellow-400 mt-3 px-1 font-bold">🎬 DEMO MODES (For Meeting):</div>
            <div className="space-y-1">
              <button
                onClick={() => setViewMode("rawreal")}
                className={`w-full text-[9px] rounded border px-2 py-2 transition font-semibold ${
                  viewMode === "rawreal"
                    ? "border-red-400 bg-red-400/20 text-red-200"
                    : "border-red-400/30 text-red-400/70 hover:border-red-400/50"
                }`}>
                🔴 THE REALITY<br/>
                <span className="text-[8px] opacity-70">Full possession chain (ballPath)<br/>All teams, messy but REAL</span>
              </button>
              <button
                onClick={() => setViewMode("hollywood")}
                className={`w-full text-[9px] rounded border px-2 py-2 transition font-semibold ${
                  viewMode === "hollywood"
                    ? "border-green-400 bg-green-400/20 text-green-200"
                    : "border-green-400/30 text-green-400/70 hover:border-green-400/50"
                }`}>
                🎬 THE HOLLYWOOD<br/>
                <span className="text-[8px] opacity-70">Clean final attack (buildup filtered)<br/>Only scoring team, polished</span>
              </button>
            </div>

            {/* OLD TEST MODES */}
            <div className="text-[9px] text-gray-500 mt-2 px-1">⚙️ Debug/Test:</div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setViewMode("apifix")}
                className={`text-[9px] rounded border px-2 py-1.5 transition font-semibold ${
                  viewMode === "apifix"
                    ? "border-orange-400 bg-orange-400/15 text-orange-300"
                    : "border-white/10 text-gray-500 hover:border-white/20"
                }`}>
                🔧 API Fix
              </button>
              <button
                onClick={() => setViewMode("bpdata")}
                className={`text-[9px] rounded border px-2 py-1.5 transition font-semibold ${
                  viewMode === "bpdata"
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                    : "border-white/10 text-gray-500 hover:border-white/20"
                }`}>
                📊 BP Data
              </button>
            </div>

            {/* RAW DATA MODE options */}
            {showRawData && (
              <div className="text-[10px] space-y-1 px-1 mt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-3 h-3 bg-cyan-400 rounded-full" />
                  <span className="text-gray-400">Pass</span>
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full ml-2" />
                  <span className="text-gray-400">Carry</span>
                  <span className="inline-block w-3 h-3 bg-red-400 rounded-full ml-2" />
                  <span className="text-gray-400">Shot</span>
                </div>
                {/* Sparse vs All toggle */}
                <button
                  onClick={() => setRawDataMode(m => m === "sparse" ? "all" : "sparse")}
                  className={`w-full text-[10px] rounded-md border px-2 py-1.5 transition font-semibold ${
                    rawDataMode === "sparse"
                      ? "border-orange-400/50 bg-orange-400/10 text-orange-300"
                      : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  }`}>
                  {rawDataMode === "sparse" ? "📍 Event Points Only (sparse)" : "📍 All Waypoints"}
                </button>
                
                {/* Speed slider for Raw Data */}
                <div className="mt-2">
                  <label className="text-[10px] text-gray-400 flex justify-between mb-1">
                    <span>⏩ Speed</span>
                    <span className="text-white">{playbackSpeed.toFixed(1)}x</span>
                  </label>
                  <input type="range" min="0.2" max="3" step="0.1" value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 appearance-none bg-gray-700 rounded-full cursor-pointer accent-red-400"
                  />
                </div>
                
                <div className="text-gray-500 mt-1">
                  {rawDataMode === "sparse" 
                    ? `${Array.from(new Set(goal.ballPath?.map(p => p.eventIndex) ?? [])).length} event points`
                    : `${goal.ballPath?.length ?? 0} waypoints`}
                </div>
              </div>
            )}

            {/* BALL PATH MODE + API FIX TEST options */}
            {(showBallPath || showApiFixTest) && (
              <div className="text-[10px] space-y-1 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-red-400 rounded" />
                  <span className="text-gray-400">Pass</span>
                  <span className="inline-block w-3 h-0.5 bg-yellow-400 rounded ml-2" />
                  <span className="text-gray-400">Carry</span>
                  <span className="inline-block w-3 h-0.5 bg-white rounded ml-2" />
                  <span className="text-gray-400">Shot</span>
                </div>
                <div className="text-gray-500">{goal.ballPath?.length ?? 0} waypoints · {goal.ballPath?.filter(p => p.type === "pass").length ?? 0} passes</div>
                {/* Buildup depth slider */}
                <div className="mt-1">
                  <label className="text-[10px] text-gray-400 flex justify-between mb-0.5">
                    <span>📏 Buildup Depth</span>
                    <span className="text-white">{buildupDepth} events</span>
                  </label>
                  <input type="range" min="2" max="30" step="1" value={buildupDepth}
                    onChange={e => setBuildupDepth(parseInt(e.target.value, 10))}
                    className="w-full h-1 appearance-none bg-gray-700 rounded-full cursor-pointer accent-red-400"
                  />
                </div>
                {/* Manual camera toggle */}
                <button
                  onClick={() => setCameraLocked(l => !l)}
                  className={`w-full text-[10px] rounded-md border px-2 py-1.5 transition font-semibold mt-0.5 ${
                    cameraLocked
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                      : "border-orange-400/50 bg-orange-400/10 text-orange-300"
                  }`}>
                  {cameraLocked ? "🔒 Auto-Camera (click to free)" : "🔓 Free Camera (drag to orbit)"}
                </button>
              </div>
            )}

            {/* REPLAY + API FIX MODE playback speed */}
            {(showBuildup || showApiFixTest) && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[11px] text-gray-400 flex justify-between mb-1">
                    <span>⏩ Speed</span>
                    <span className="text-white">{playbackSpeed.toFixed(1)}x</span>
                  </label>
                  <input type="range" min="0.2" max="3" step="0.1" value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 appearance-none bg-gray-700 rounded-full cursor-pointer accent-green-400"
                  />
                </div>

                {/* Current event display */}
                {goal.buildup && (() => {
                  const actionEvents = goal.buildup.filter(e =>
                    ["pass", "carry", "dribble", "shot", "goal", "ball-recovery", "tackle", "block", "clearance", "interception"].includes(e.type)
                  );
                  const ev = actionEvents[currentReplayEvent];
                  if (!ev) return null;
                  const typeEmoji: Record<string, string> = {
                    pass: "➡️", carry: "🏃", dribble: "⚡", goal: "⚽", "ball-recovery": "💪",
                    tackle: "🦵", block: "🛡️", clearance: "🔨", interception: "✋", shot: "🎯",
                  };
                  const teamSide = ev.teamId === goal.teamId ? "ATT" : "DEF";
                  const heightEmoji = ev.passHeight === "high" ? "⬆️" : ev.passHeight === "low" ? "↗️" : "➡️";
                  const bodyEmoji: Record<string, string> = {
                    "right-foot": "🦶R", "left-foot": "🦶L", "head": "🤯", "other": "🤷",
                  };
                  return (
                    <div className={`rounded-lg p-2 text-[11px] ${ev.type === "goal" ? "bg-yellow-400/15 border border-yellow-400/30" : ev.keyPass ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-white/5"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{currentReplayEvent + 1}/{actionEvents.length}</span>
                        <span className={`font-bold ${ev.type === "goal" ? "text-yellow-300" : ev.keyPass ? "text-yellow-200" : "text-white"}`}>
                          {typeEmoji[ev.type] || "📍"} {ev.type.toUpperCase()}
                          {ev.keyPass && " ⭐"}
                        </span>
                      </div>
                      <div className="mt-1 text-white font-semibold">
                        {ev.playerName}
                        {ev.recipient && <span className="text-gray-400 font-normal"> → {ev.recipient}</span>}
                        <span className="text-gray-500 font-normal ml-1">({teamSide})</span>
                      </div>
                      <div className="flex gap-2 mt-1 text-gray-400">
                        <span>{ev.minute}&apos;{ev.second > 0 ? `:${String(ev.second).padStart(2, "0")}` : ""}</span>
                        {ev.bodyPart && <span>{bodyEmoji[ev.bodyPart] || ev.bodyPart}</span>}
                        {ev.passHeight && <span>{heightEmoji} {ev.passHeight}</span>}
                        {ev.firstTime && <span className="text-cyan-400">1st touch</span>}
                      </div>
                      {ev.xg != null && <div className="text-yellow-300 mt-1">xG: {ev.xg.toFixed(3)}</div>}
                      {ev.outcome && ev.outcome !== "complete" && (
                        <div className={`mt-1 ${ev.outcome === "goal" ? "text-yellow-300 font-bold" : "text-orange-400"}`}>
                          {ev.outcome === "goal" ? "⚽ GOAL!" : ev.outcome.toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Player info card overlay */}
        {selectedPlayerInfo && (
          <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md border border-white/20 rounded-xl p-4 min-w-[220px] shadow-2xl">
            <button onClick={() => setSelectedPlayer(null)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-sm">✕</button>
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-2xl font-black w-10 h-10 rounded-full flex items-center justify-center ${isWrexham ? "bg-red-500/30 text-red-300" : "bg-blue-500/30 text-blue-300"}`}>
                {selectedPlayerInfo.jersey}
              </div>
              <div>
                <div className="font-bold text-sm">{selectedPlayerInfo.name}</div>
                <div className="text-xs text-gray-400">{selectedPlayerInfo.team}</div>
              </div>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>{selectedPlayerInfo.role}</div>
              {selectedPlayerInfo.isShooter && (
                <>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <span className="text-gray-400">Shot speed: </span>
                    <span className={goal.speedKmh > 80 ? "text-red-400 font-bold" : "text-white"}>{goal.speedKmh}km/h</span>
                  </div>
                  <div><span className="text-gray-400">xG: </span><span className="text-white">{goal.xg.toFixed(3)}</span></div>
                  <div><span className="text-gray-400">Distance: </span><span className="text-white">{goal.distanceM}m</span></div>
                  <div><span className="text-gray-400">Body: </span><span className="text-white">{goal.bodyPart} / {goal.technique}</span></div>
                  <div><span className="text-gray-400">Height: </span><span className="text-white">{goal.startZ.toFixed(1)}m → {(goal.endZ || 0).toFixed(1)}m</span></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="shrink-0 border-t border-white/10 bg-black/80 px-6 py-2">
        <div className="flex gap-6 text-sm text-gray-400">
          <span>🚀 Speed: <strong className={`${goal.speedKmh > 80 ? "text-red-400" : "text-white"}`}>{goal.speedKmh}km/h</strong></span>
          <span>📏 Distance: <strong className="text-white">{goal.distanceM}m</strong></span>
          <span>⬆️ Height: <strong className="text-white">{goal.startZ.toFixed(1)}m → {(goal.endZ || 0).toFixed(1)}m</strong></span>
          <span>🎯 xG: <strong className="text-white">{goal.xg.toFixed(2)}</strong></span>
          <span>👥 Players: <strong className="text-white">{goal.freezeFrame.length}</strong></span>
          <span>🦶 {goal.bodyPart} / {goal.technique}</span>
        </div>
      </div>
    </div>
  );
}
