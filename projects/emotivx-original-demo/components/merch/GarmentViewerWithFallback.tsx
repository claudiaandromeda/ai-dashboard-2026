"use client";

/**
 * GarmentViewerWithFallback — capability-gated 3D viewer.
 *
 * Logo, badge, and name/number are rendered as DecalGeometry decals
 * directly on the 3D mesh surface (no CSS overlays).
 */

import React, { Component, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getWebGLTierCached, type WebGLTier } from "@/lib/webgl-detect";
import FlatGarmentFallback from "./FlatGarmentFallback";
import { DEFAULT_TEXTURE_CONTROLS, DEFAULT_VIEW_CONTROLS, type BadgeData, type TextureControls, type ViewControls } from "./GarmentViewer3D";

const GarmentViewer3D = dynamic(() => import("./GarmentViewer3D"), { ssr: false });

const SUPABASE_MODELS = "https://ztifybswmduiubhbecbe.supabase.co/storage/v1/object/public/models";
const MODEL_PATHS: Record<string, string> = {
  hoodie:     `${SUPABASE_MODELS}/hoodie.glb`,
  tshirt:     `${SUPABASE_MODELS}/tshirt.glb`,
  longsleeve: `${SUPABASE_MODELS}/longsleeve.glb`,
};

/* ── Error boundary ───────────────────────────────────────────────────── */
class ThreeErrorBoundary extends Component<
  { children: React.ReactNode; onCrash: () => void },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(e: Error) {
    console.error("[GarmentViewer3D] CRASH →", e.message, "\n", e.stack);
    this.props.onCrash();
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

/* ── Props ────────────────────────────────────────────────────────────── */
export interface GarmentViewerWithFallbackProps {
  productType: string;
  artworkUrl?: string | null;
  loading?: boolean;
  height?: number;
  className?: string;
  textureControls?: TextureControls;
  viewControls?: ViewControls;
  /** Team logo URL — rendered as decal on left chest */
  teamLogoUrl?: string | null;
  /** Show/hide logo decal */
  showLogo?: boolean;
  /** Team primary colour — for badge accent */
  teamPrimaryColour?: string;
  /** Moment badge data — always shown when present */
  badgeData?: BadgeData | null;
  /** Player name for back decal */
  playerName?: string | null;
  /** Player number for back decal */
  playerNumber?: number | null;
  /** Show/hide name + number on back */
  showNameNumber?: boolean;
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function GarmentViewerWithFallback({
  productType,
  artworkUrl,
  loading = false,
  height,
  className = "",
  textureControls = DEFAULT_TEXTURE_CONTROLS,
  viewControls = DEFAULT_VIEW_CONTROLS,
  teamLogoUrl,
  showLogo = true,
  teamPrimaryColour,
  badgeData,
  playerName,
  playerNumber,
  showNameNumber = true,
}: GarmentViewerWithFallbackProps) {
  const [tier, setTier] = useState<WebGLTier | null>(null);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    setTier(getWebGLTierCached());
  }, []);

  const modelPath = MODEL_PATHS[productType];
  const containerClass = `relative w-full ${height ? "" : "h-full"} ${className}`;
  const containerStyle = height ? { height } : undefined;

  if (tier === null) {
    return (
      <div className={containerClass} style={containerStyle}>
        <FlatGarmentFallback productType={productType} artworkUrl={artworkUrl}
          loading={loading} height={height ?? 520} className="w-full h-full"
          textureControls={textureControls} />
      </div>
    );
  }

  if (tier === "none" || !modelPath || crashed) {
    return (
      <div className={containerClass} style={containerStyle}>
        <FlatGarmentFallback productType={productType} artworkUrl={artworkUrl}
          loading={loading} height={height ?? 520} className="w-full h-full"
          textureControls={textureControls} reason={crashed ? "error" : "webgl"} />
      </div>
    );
  }

  return (
    <div className={containerClass} style={containerStyle}>
      <ThreeErrorBoundary onCrash={() => setCrashed(true)}>
        <GarmentViewer3D
          modelPath={modelPath}
          garmentType={productType}
          artworkUrl={artworkUrl}
          loading={loading}
          height={height}
          className="w-full h-full"
          textureControls={textureControls}
          viewControls={viewControls}
          logoUrl={teamLogoUrl}
          showLogo={showLogo}
          badgeData={badgeData}
          playerName={playerName}
          playerNumber={playerNumber}
          showNameNumber={showNameNumber}
          teamColour={teamPrimaryColour}
        />
      </ThreeErrorBoundary>
    </div>
  );
}
