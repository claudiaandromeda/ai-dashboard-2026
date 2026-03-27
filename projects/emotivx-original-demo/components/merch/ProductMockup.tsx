"use client";

/* ── ProductMockup ─────────────────────────────────────────────────────
   Simple CSS/SVG mockup shapes for products that don't have
   garment SVG templates (phone cases, mugs, caps, prints, totes, etc.).
   The artwork fills each shape via background-image or mask.
──────────────────────────────────────────────────────────────────────── */

interface ProductMockupProps {
  product: string;
  artworkUrl?: string | null;
  placeholderGradient?: string;
  loading?: boolean;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #DA291C 0%, #1a1a2e 50%, #DA291C 100%)";

export default function ProductMockup({
  product,
  artworkUrl,
  placeholderGradient = DEFAULT_GRADIENT,
  loading = false,
}: ProductMockupProps) {
  const bg = artworkUrl
    ? `url(${artworkUrl}) center/cover`
    : placeholderGradient;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(218,41,28,0.25), transparent 70%)",
        }}
      />

      {product === "Phone Case" && <PhoneCaseMockup bg={bg} />}
      {product === "Mug" && <MugMockup bg={bg} />}
      {product === "Snapback Cap" && <CapMockup bg={bg} type="snapback" />}
      {product === "Dad Cap" && <CapMockup bg={bg} type="dad" />}
      {product === "Art Print" && <PrintMockup bg={bg} framed={false} />}
      {product === "Framed Print" && <PrintMockup bg={bg} framed />}
      {product === "Canvas Print" && <CanvasMockup bg={bg} />}
      {product === "Tote Bag" && <ToteMockup bg={bg} />}
      {product === "Poster" && <PosterMockup bg={bg} />}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse bg-white/5" />
          <div className="z-10 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            Generating…
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Phone Case ───────────────────────────────────────────────────── */

function PhoneCaseMockup({ bg }: { bg: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "45%", aspectRatio: "9 / 19" }}>
      {/* Outer shell */}
      <div
        className="absolute inset-0 rounded-[2rem] border-2 border-white/10"
        style={{ background: bg }}
      />
      {/* Screen cutout */}
      <div className="absolute inset-[6%] rounded-[1.5rem] border border-white/5 bg-black/40 backdrop-blur-sm" />
      {/* Camera notch */}
      <div className="absolute left-1/2 top-[8%] h-[3%] w-[25%] -translate-x-1/2 rounded-full bg-black/60" />
    </div>
  );
}

/* ── Mug ──────────────────────────────────────────────────────────── */

function MugMockup({ bg }: { bg: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "60%", aspectRatio: "4 / 3" }}>
      {/* Body */}
      <div
        className="absolute inset-0 rounded-b-xl rounded-t-sm border-2 border-white/10"
        style={{ background: bg, borderRadius: "4px 4px 20px 20px" }}
      />
      {/* Handle */}
      <div
        className="absolute -right-[15%] top-[15%] h-[50%] w-[20%] rounded-r-full border-2 border-l-0 border-white/10"
      />
      {/* Rim */}
      <div className="absolute left-0 right-0 top-0 h-[6%] rounded-t-sm bg-white/10" />
    </div>
  );
}

/* ── Cap ──────────────────────────────────────────────────────────── */

function CapMockup({ bg, type }: { bg: string; type: "snapback" | "dad" }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "60%", aspectRatio: "5 / 4" }}>
      <svg viewBox="0 0 200 160" className="h-full w-full">
        <defs>
          <clipPath id={`cap-clip-${type}`}>
            {/* Crown */}
            <path d={
              type === "snapback"
                ? "M40,90 Q40,30 100,25 Q160,30 160,90 L160,100 L40,100 Z"
                : "M45,90 Q50,35 100,30 Q150,35 155,90 L155,100 L45,100 Z"
            } />
            {/* Brim */}
            <ellipse cx="100" cy="105" rx={type === "snapback" ? 80 : 70} ry="20" />
          </clipPath>
        </defs>
        {/* Artwork fill */}
        <rect
          x="0" y="0" width="200" height="160"
          clipPath={`url(#cap-clip-${type})`}
          fill="url(#cap-bg)"
          style={{ background: bg }}
        />
        {/* Fallback fill using foreignObject */}
        <foreignObject x="0" y="0" width="200" height="160" clipPath={`url(#cap-clip-${type})`}>
          <div style={{ width: "100%", height: "100%", background: bg }} />
        </foreignObject>
        {/* Outline */}
        <path
          d={
            type === "snapback"
              ? "M40,90 Q40,30 100,25 Q160,30 160,90 L160,100 L40,100 Z"
              : "M45,90 Q50,35 100,30 Q150,35 155,90 L155,100 L45,100 Z"
          }
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
        />
        <ellipse
          cx="100" cy="105"
          rx={type === "snapback" ? 80 : 70} ry="20"
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
        />
        {/* Front panel seam */}
        <line x1="100" y1="25" x2="100" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ── Print (framed / unframed) ────────────────────────────────────── */

function PrintMockup({ bg, framed }: { bg: string; framed: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "55%", aspectRatio: "3 / 4" }}>
      {framed && (
        /* Black aluminium frame */
        <div className="absolute -inset-[5%] rounded-sm border-[6px] border-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" />
      )}
      {/* Mat / border */}
      <div className={`absolute inset-0 ${framed ? "bg-[#1a1a1a] p-[8%]" : "border-2 border-white/10"}`}>
        <div
          className="h-full w-full"
          style={{ background: bg }}
        />
      </div>
      {!framed && (
        /* Subtle paper shadow for unframed */
        <div className="absolute -bottom-1 left-1 right-1 h-2 rounded-b-sm bg-black/20 blur-sm" />
      )}
    </div>
  );
}

/* ── Canvas ────────────────────────────────────────────────────────── */

function CanvasMockup({ bg }: { bg: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "55%", aspectRatio: "3 / 4" }}>
      {/* Shadow depth — gives gallery-wrap look */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-[#0a0a0a]" />
      {/* Canvas face */}
      <div
        className="absolute inset-0 border border-white/10"
        style={{ background: bg }}
      />
      {/* Top edge highlight */}
      <div className="absolute left-0 right-0 top-0 h-px bg-white/10" />
    </div>
  );
}

/* ── Tote Bag ─────────────────────────────────────────────────────── */

function ToteMockup({ bg }: { bg: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "50%", aspectRatio: "3 / 4" }}>
      {/* Handles */}
      <div className="absolute -top-[10%] left-[20%] h-[15%] w-[15%] rounded-t-full border-2 border-b-0 border-white/15" />
      <div className="absolute -top-[10%] right-[20%] h-[15%] w-[15%] rounded-t-full border-2 border-b-0 border-white/15" />
      {/* Bag body */}
      <div
        className="absolute inset-0 rounded-b-lg border-2 border-white/10"
        style={{ background: bg }}
      />
    </div>
  );
}

/* ── Poster ────────────────────────────────────────────────────────── */

function PosterMockup({ bg }: { bg: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "50%", aspectRatio: "1 / 1.414" }}>
      {/* Slight curl shadow */}
      <div className="absolute -bottom-0.5 left-2 right-2 h-2 rounded-b bg-black/30 blur-sm" />
      {/* Poster face */}
      <div
        className="absolute inset-0 border border-white/10"
        style={{ background: bg }}
      />
    </div>
  );
}
