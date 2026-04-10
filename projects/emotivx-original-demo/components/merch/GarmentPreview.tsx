"use client";

import { useEffect, useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ProductType =
  | "hoodie"
  | "tshirt"
  | "longsleeve"
  | "phonecase"
  | "snapback"
  | "dadcap"
  | "mug"
  | "artprint"
  | "framedprint"
  | "canvas"
  | "totebag"
  | "poster";

/** @deprecated — use ProductType instead */
export type GarmentType = "hoodie" | "tshirt" | "longsleeve";
export type GarmentView = "front" | "back";

interface GarmentPreviewProps {
  /** Product type — supports all 12 products */
  productType?: ProductType;
  /** @deprecated — use productType */
  garmentType?: GarmentType;
  view: GarmentView;
  /** URL of artwork image — fills the product shape via CSS mask */
  artworkUrl?: string | null;
  /** CSS gradient string used when no artwork is provided */
  placeholderGradient?: string;
  /** Optional pulsing overlay while regenerating */
  loading?: boolean;
}

/* ── Template config per product ──────────────────────────────────── */

interface TemplateConfig {
  w: number;
  h: number;
  mask: string;
  detail: string;
  hasViews: boolean;
}

function tmpl(
  type: ProductType,
  view: GarmentView,
): { w: number; h: number; mask: string; detail: string } {
  const cfg = TEMPLATES[type];
  if (cfg.hasViews) {
    return {
      w: cfg.w,
      h: cfg.h,
      mask: `/templates/${type}-${view}-mask.svg`,
      detail: `/templates/${type}-${view}.svg`,
    };
  }
  return { w: cfg.w, h: cfg.h, mask: cfg.mask, detail: cfg.detail };
}

const TEMPLATES: Record<ProductType, TemplateConfig> = {
  hoodie:      { w: 600, h: 750, mask: "", detail: "", hasViews: true },
  tshirt:      { w: 600, h: 700, mask: "", detail: "", hasViews: true },
  longsleeve:  { w: 600, h: 750, mask: "", detail: "", hasViews: true },
  phonecase:   { w: 300, h: 600, mask: "/templates/phonecase-mask.svg",       detail: "/templates/phonecase.svg",       hasViews: false },
  snapback:    { w: 500, h: 400, mask: "/templates/snapback-front-mask.svg",  detail: "/templates/snapback-front.svg",  hasViews: false },
  dadcap:      { w: 500, h: 400, mask: "/templates/dadcap-front-mask.svg",    detail: "/templates/dadcap-front.svg",    hasViews: false },
  mug:         { w: 600, h: 450, mask: "/templates/mug-side-mask.svg",        detail: "/templates/mug-side.svg",        hasViews: false },
  artprint:    { w: 500, h: 700, mask: "/templates/artprint-mask.svg",        detail: "/templates/artprint.svg",        hasViews: false },
  framedprint: { w: 500, h: 700, mask: "/templates/framedprint-mask.svg",     detail: "/templates/framedprint.svg",     hasViews: false },
  canvas:      { w: 500, h: 700, mask: "/templates/canvas-mask.svg",          detail: "/templates/canvas.svg",          hasViews: false },
  totebag:     { w: 500, h: 600, mask: "/templates/totebag-mask.svg",         detail: "/templates/totebag.svg",         hasViews: false },
  poster:      { w: 500, h: 700, mask: "/templates/poster-mask.svg",          detail: "/templates/poster.svg",          hasViews: false },
};

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #8AE234 0%, #1a1a2e 50%, #8AE234 100%)";

/* ── Component ─────────────────────────────────────────────────────── */

export default function GarmentPreview({
  productType,
  garmentType,
  view,
  artworkUrl,
  placeholderGradient = DEFAULT_GRADIENT,
  loading = false,
}: GarmentPreviewProps) {
  const resolvedType: ProductType = productType ?? garmentType ?? "hoodie";
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");

  const { w, h, mask: maskPath, detail: templatePath } = tmpl(resolvedType, view);

  /* Fetch mask SVG (solid filled silhouette) + detail SVG (line art overlay) */
  useEffect(() => {
    let revoked = false;
    let blobUrl = "";

    Promise.all([
      fetch(maskPath).then((r) => r.ok ? r.text() : null).catch(() => null),
      fetch(templatePath).then((r) => r.ok ? r.text() : "").catch(() => ""),
    ]).then(([maskSvg, detailSvg]) => {
      if (revoked) return;
      if (maskSvg) {
        const blob = new Blob([maskSvg], { type: "image/svg+xml" });
        blobUrl = URL.createObjectURL(blob);
        setSvgDataUrl(blobUrl);
      } else {
        setSvgDataUrl("");
      }
      setSvgContent(detailSvg || "");
    });

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [maskPath, templatePath]);

  const artworkStyle: React.CSSProperties = artworkUrl
    ? {
        backgroundImage: `url(${artworkUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: placeholderGradient,
      };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-md select-none"
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {/* Ambient glow behind the product */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(138,226,52,0.25), transparent 70%)" }}
      />

      {/* ── Artwork fills product shape via SVG mask ── */}
      {svgDataUrl && (
        <div
          className="absolute inset-0"
          style={{
            ...artworkStyle,
            WebkitMaskImage: `url(${svgDataUrl})`,
            maskImage: `url(${svgDataUrl})`,
            WebkitMaskSize: "contain",
            maskSize: "contain" as string,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat" as string,
            WebkitMaskPosition: "center",
            maskPosition: "center" as string,
          }}
        />
      )}

      {/* ── Detail overlay (thin white lineart) ── */}
      {svgContent && (
        <div
          className="pointer-events-none absolute inset-0"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute inset-0 animate-pulse rounded-xl bg-white/5"
            style={{
              WebkitMaskImage: svgDataUrl ? `url(${svgDataUrl})` : undefined,
              maskImage: svgDataUrl ? `url(${svgDataUrl})` : undefined,
              WebkitMaskSize: "contain",
              maskSize: "contain" as string,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat" as string,
              WebkitMaskPosition: "center",
              maskPosition: "center" as string,
            }}
          />
          <div className="z-10 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            Generating…
          </div>
        </div>
      )}

      {/* Fallback while loading SVG */}
      {!svgDataUrl && !svgContent && (
        <div
          className="flex h-full w-full items-center justify-center text-gray-600"
        >
          Loading…
        </div>
      )}
    </div>
  );
}
