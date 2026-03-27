"use client";

/**
 * FlatGarmentFallback — 2D configurable garment preview.
 * Shown when WebGL is unavailable or the device is too low-end for 3D.
 * The pattern controls (repeat, rotation, offset, brightness) still work
 * so customers can still customise their design.
 */

import Image from "next/image";
import { useMemo } from "react";
import type { TextureControls } from "./GarmentViewer3D";

interface FlatGarmentFallbackProps {
  productType: "hoodie" | "tshirt" | "longsleeve" | string;
  artworkUrl?: string | null;
  loading?: boolean;
  height?: number;
  className?: string;
  textureControls?: TextureControls;
  /** "webgl" = device can't do WebGL, "error" = 3D crashed mid-session */
  reason?: "webgl" | "error" | "lowend";
}

const MASK_PATHS: Record<string, string> = {
  hoodie: "/templates/hoodie-front-mask.svg",
  tshirt: "/templates/tshirt-front-mask.svg",
  longsleeve: "/templates/longsleeve-front-mask.svg",
};

const LINEART_PATHS: Record<string, string> = {
  hoodie: "/templates/hoodie-front.svg",
  tshirt: "/templates/tshirt-front.svg",
  longsleeve: "/templates/longsleeve-front.svg",
};

const REASON_MESSAGES: Record<string, string> = {
  webgl: "Your device doesn't support 3D previews",
  lowend: "3D preview not available on this device",
  error: "3D preview couldn't load",
};

export default function FlatGarmentFallback({
  productType,
  artworkUrl,
  loading = false,
  height = 520,
  className = "",
  textureControls,
  reason,
}: FlatGarmentFallbackProps) {
  const maskPath = MASK_PATHS[productType] ?? MASK_PATHS.hoodie;
  const lineartPath = LINEART_PATHS[productType] ?? LINEART_PATHS.hoodie;

  // Build the CSS background style from textureControls
  const patternStyle = useMemo(() => {
    if (!artworkUrl || !textureControls) return {};
    const { repeat, rotation, offsetX, offsetY, brightness } = textureControls;
    const sizePct = Math.round(100 / repeat);
    return {
      backgroundImage: `url(${artworkUrl})`,
      backgroundSize: `${sizePct}% ${sizePct}%`,
      backgroundPosition: `${offsetX * 100}% ${offsetY * 100}%`,
      transform: `rotate(${rotation}deg)`,
      filter: `brightness(${brightness})`,
    };
  }, [artworkUrl, textureControls]);

  const fallbackBg = !artworkUrl
    ? { background: "linear-gradient(135deg, #DA291C 0%, #1a0a0a 50%, #DA291C 100%)" }
    : {};

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${className}`}
      style={{ height }}
    >
      {/* Reason banner */}
      {reason && (
        <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-center text-xs text-white/60">
            {REASON_MESSAGES[reason] ?? "Showing flat preview"}{" "}
            <span className="text-white/40">— you can still customise your design below.</span>
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#DA291C]" />
            <span className="text-xs text-white/60">Generating artwork…</span>
          </div>
        </div>
      )}

      {/* Garment silhouette with artwork fill */}
      <div className="relative flex items-center justify-center" style={{ height: height - (reason ? 48 : 0) }}>
        {/* Artwork layer — clipped to garment shape via mask */}
        {artworkUrl ? (
          <div
            className="absolute inset-0 rounded-lg transition-all duration-300"
            style={{
              maskImage: `url(${maskPath})`,
              WebkitMaskImage: `url(${maskPath})`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              ...patternStyle,
            }}
          />
        ) : (
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              maskImage: `url(${maskPath})`,
              WebkitMaskImage: `url(${maskPath})`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              ...fallbackBg,
            }}
          />
        )}

        {/* Garment lineart overlay */}
        <img
          src={lineartPath}
          alt={productType}
          className="pointer-events-none relative z-10 h-full w-auto object-contain opacity-60"
          style={{ maxHeight: height - (reason ? 60 : 16) }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    </div>
  );
}
