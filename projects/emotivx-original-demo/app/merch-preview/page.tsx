"use client";

import { Suspense, useState, useCallback, useRef, useEffect, Component, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ShoppingCart,
  Eye,
  Truck,
  Check,
  Info,
  X,
  RefreshCw,
  Package,
  ChevronDown,
} from "lucide-react";
import { getTeam, type TeamConfig } from "@/lib/teams";
import GarmentPreview, {
  type ProductType,
  type GarmentView,
} from "@/components/merch/GarmentPreview";
import { DEFAULT_TEXTURE_CONTROLS, DEFAULT_VIEW_CONTROLS, type TextureControls, type ViewControls } from "@/components/merch/GarmentViewer3D";
import EditionCard from "@/components/merch/EditionCard";
import { useCart } from "@/components/cart/CartProvider";

const GarmentViewerWithFallback = dynamic(
  () => import("@/components/merch/GarmentViewerWithFallback"),
  { ssr: false }
);

/* ── Product catalogue ──────────────────────────────────────────────── */

interface Product {
  label: string;
  shortLabel: string;
  price: number;
  productType: ProductType;
  icon: string;
  description: string;
  materials: string;
  sizing: string;
  care: string;
  hasSizes: boolean;
  hasColours: boolean;
  hasViews: boolean;
}

const PRODUCTS: Product[] = [
  {
    label: "Hoodie",
    shortLabel: "Hoodie",
    price: 79,
    productType: "hoodie",
    icon: "🧥",
    description: "Premium All-Over-Print hoodie — entire garment covered in your moment artwork. Kangaroo pocket, brushed fleece interior. Every All-Over-Print garment is hand sewn and hand finished by REAL people.",
    materials: "80% cotton, 20% polyester brushed fleece. All-over dye-sublimation print.",
    sizing: "Unisex relaxed fit. XS–XXL. See size guide for measurements.",
    care: "Machine wash cold inside-out. Hang dry. Do not iron directly on print.",
    hasSizes: true,
    hasColours: true,
    hasViews: true,
  },
  {
    label: "T-Shirt",
    shortLabel: "Tee",
    price: 45,
    productType: "tshirt",
    icon: "👕",
    description: "All-Over-Print tee. Your moment artwork IS the fabric — not a patch, the whole thing. Every All-Over-Print garment is hand sewn and hand finished by REAL people.",
    materials: "100% polyester moisture-wicking fabric. All-over dye-sublimation print.",
    sizing: "Unisex regular fit. XS–XXL. See size guide for measurements.",
    care: "Machine wash cold inside-out. Tumble dry low. Do not bleach.",
    hasSizes: true,
    hasColours: true,
    hasViews: true,
  },
  {
    label: "Long Sleeve",
    shortLabel: "L/Sleeve",
    price: 55,
    productType: "longsleeve",
    icon: "🧥",
    description: "All-Over-Print long sleeve. Ribbed cuffs, athletic fit. Your moment from cuff to cuff. Every All-Over-Print garment is hand sewn and hand finished by REAL people.",
    materials: "100% polyester moisture-wicking fabric. All-over dye-sublimation print.",
    sizing: "Unisex athletic fit. XS–XXL. See size guide for measurements.",
    care: "Machine wash cold inside-out. Hang dry. Do not iron directly on print.",
    hasSizes: true,
    hasColours: true,
    hasViews: true,
  },
  {
    label: "Phone Case",
    shortLabel: "Phone",
    price: 25,
    productType: "phonecase",
    icon: "📱",
    description: "Glossy hard shell phone case with full artwork wrap. Fits iPhone 14/15/16 & Samsung Galaxy S23/S24/S25 series.",
    materials: "Polycarbonate hard shell with glossy UV-printed finish. Raised edges for screen protection.",
    sizing: "Select your phone model at checkout. Compatible with MagSafe (iPhone models).",
    care: "Wipe clean with damp cloth. Avoid prolonged sun exposure to preserve colours.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Snapback Cap",
    shortLabel: "Snapback",
    price: 35,
    productType: "snapback",
    icon: "🧢",
    description: "Structured snapback with full artwork print across all panels. Flat brim, adjustable snap closure.",
    materials: "Cotton twill with sublimated artwork print. Structured front panels, plastic snap closure.",
    sizing: "One size fits most. Adjustable snapback closure (54–62cm).",
    care: "Spot clean only. Do not machine wash. Air dry.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Dad Cap",
    shortLabel: "Dad Cap",
    price: 30,
    productType: "dadcap",
    icon: "🧢",
    description: "Unstructured dad cap with embroidered team crest and subtle artwork on the brim. Low-profile, relaxed fit.",
    materials: "Washed cotton twill. Embroidered crest on front, sublimated artwork on brim.",
    sizing: "One size fits most. Adjustable brass buckle closure (54–62cm).",
    care: "Spot clean only. Do not machine wash. Reshape while damp.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Mug",
    shortLabel: "Mug",
    price: 18,
    productType: "mug",
    icon: "☕",
    description: "Ceramic 11oz mug with full artwork wrap. Team crest on the handle side. Dishwasher & microwave safe.",
    materials: "White ceramic, 11oz / 325ml. Full-wrap dye-sublimation print.",
    sizing: "Standard 11oz mug. Height: 9.5cm, Diameter: 8cm.",
    care: "Dishwasher safe (top rack). Microwave safe. Hand wash for longest print life.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Art Print",
    shortLabel: "Print",
    price: 35,
    productType: "artprint",
    icon: "🖼️",
    description: "Giclée art print on heavyweight 300gsm card. A3 size (297 x 420mm), unframed. Museum-quality archival inks.",
    materials: "300gsm fine-art card stock. Giclée printed with archival pigment inks. Unframed.",
    sizing: "A3 (297 x 420mm / 11.7 x 16.5 in).",
    care: "Handle by edges. Keep away from direct sunlight and moisture. Frame under glass for best preservation.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Framed Print",
    shortLabel: "Framed",
    price: 65,
    productType: "framedprint",
    icon: "🖼️",
    description: "Same A3 giclée print in a sleek black aluminium frame with acrylic glazing. Ready to hang.",
    materials: "300gsm fine-art card stock. Black anodised aluminium frame. Acrylic glazing, MDF backing.",
    sizing: "A3 print (297 x 420mm) in frame. Overall: ~320 x 445mm.",
    care: "Wipe frame with dry cloth. Avoid hanging in direct sunlight or humid environments.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Canvas Print",
    shortLabel: "Canvas",
    price: 55,
    productType: "canvas",
    icon: "🎨",
    description: "Gallery-wrapped canvas print, ready to hang. Artwork wraps around 3cm-deep wooden stretcher bars.",
    materials: "Poly-cotton canvas with matte finish. Pine stretcher bars (3cm depth). Archival inks.",
    sizing: "40 x 50cm (approx. 16 x 20 in). 3cm gallery wrap depth.",
    care: "Dust gently with soft cloth. Avoid hanging in direct sunlight or damp areas.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Tote Bag",
    shortLabel: "Tote",
    price: 22,
    productType: "totebag",
    icon: "👜",
    description: "Heavy-duty cotton tote with full artwork printed on both sides. Generous size for matchday essentials.",
    materials: "12oz heavy cotton canvas. All-over dye-sublimation print on both sides.",
    sizing: "38 x 42cm body, 63cm strap drop. Holds up to 10kg.",
    care: "Machine wash cold, gentle cycle. Hang dry. Do not bleach or tumble dry.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
  {
    label: "Poster",
    shortLabel: "Poster",
    price: 15,
    productType: "poster",
    icon: "📋",
    description: "A2 matte poster, high-quality lithographic print. Bold colours, sharp detail. Perfect for the wall.",
    materials: "170gsm silk-coated paper. High-quality lithographic (litho) print.",
    sizing: "A2 (420 x 594mm / 16.5 x 23.4 in).",
    care: "Handle by edges. Roll for storage. Frame for best display.",
    hasSizes: false,
    hasColours: false,
    hasViews: false,
  },
];

type ProductLabel = string;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];

const COLOURS = [
  { name: "Wrexham Red",   hex: "#BA0C2F" },  // brand red — always first
  { name: "White",         hex: "#FFFFFF" },  // brand white
  { name: "Wrexham Gold",  hex: "#C9A84C" },  // antique gold accent
  { name: "Forest",        hex: "#115740" },  // brand green
  { name: "Gold",          hex: "#FFD100" },  // brand gold (away hero)
  { name: "Black",         hex: "#111111" },
  { name: "Navy",          hex: "#1B2A4A" },
  { name: "Grey",          hex: "#4A4A4A" },
] as const;
type ColourName = (typeof COLOURS)[number]["name"];

// Default secondary colours in Wrexham order (auto-applied if none chosen)
// Default bg secondary order (after primary is chosen)
const WREXHAM_SECONDARY_ORDER: ColourName[] = ["White", "Wrexham Gold", "Forest", "Black"];
// Luminance check for auto data colour (dark bg → white data, light bg → dark data)
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function getOppositeColour(hex: string): ColourName {
  return getLuminance(hex) < 0.5 ? "White" : "Black";
}

const VIEWS: GarmentView[] = ["front", "back"];

/* ── Size guide measurements ────────────────────────────────────────── */

const SIZE_GUIDE: Record<string, Record<string, string>> = {
  XS:  { Chest: "86cm", Length: "66cm", Sleeve: "60cm" },
  S:   { Chest: "91cm", Length: "69cm", Sleeve: "61cm" },
  M:   { Chest: "97cm", Length: "72cm", Sleeve: "63cm" },
  L:   { Chest: "102cm", Length: "74cm", Sleeve: "64cm" },
  XL:  { Chest: "109cm", Length: "76cm", Sleeve: "66cm" },
  XXL: { Chest: "117cm", Length: "79cm", Sleeve: "68cm" },
};

/* ── Art customisation constants ────────────────────────────────────── */

/* ── Wrexham moment catalogue ───────────────────────────────────────── */
const WREXHAM_MOMENTS = [
  {
    matchId: "1377235",
    label: "Boxing Day — Wrexham vs Sheffield Utd (26 Dec 2025)",
    goals: [
      { index: 0, label: "51' Longman #47  xg 0.26" },
      { index: 4, label: "27' K. Moore #19  xg 0.29" },
      { index: 5, label: "75' K. Moore #19  xg 0.12" },
      { index: 6, label: "80' Windass #10  xg 0.75 ⭐" },
    ],
  },
  {
    matchId: "1376994",
    label: "Halloween — Wrexham vs Coventry City (31 Oct 2025)",
    goals: [
      { index: 0, label: "59' K. Moore #19  xg 0.47 (hat-trick)" },
      { index: 2, label: "68' K. Moore #19  xg 0.16 (hat-trick)" },
      { index: 3, label: "82' K. Moore #19  xg 0.20 (hat-trick)" },
    ],
  },
  {
    matchId: "1377475",
    label: "Feb Comeback — Wrexham vs Ipswich Town (21 Feb 2026)",
    goals: [
      { index: 1, label: "5'  K. Moore #19  xg 0.05" },
      { index: 3, label: "65' Thomason #14  xg 0.16" },
      { index: 4, label: "74' C. Doyle #2   xg 0.18" },
      { index: 5, label: "85' Broadhead #33 xg 0.43 (winner)" },
      { index: 6, label: "36' Windass #10   xg 0.15" },
    ],
  },
] as const;

/* ── Collapsible section ──────────────────────────────────────────────── */
function Section({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-1"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#666] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

const ART_STYLES = [
  { id: "classic",    label: "Classic"   },
  { id: "geometric",  label: "Geometric" },
  { id: "camo",       label: "Camo"      },
  { id: "futuristic", label: "Spider"    },
  { id: "street",     label: "Street"    },
  { id: "marble",     label: "Marble"    },
  { id: "smoky",      label: "Smoky"     },
  { id: "jackson",    label: "Jackson"   },
  { id: "dali",       label: "Dali"      },
] as const;
type BaseStyleId = (typeof ART_STYLES)[number]["id"];
type KitVariant = "home" | "away";
type StyleId = string; // e.g. "classic-home", "geometric-away"

// Kit colour map for auto-applying palette when home/away kit is chosen
const KIT_COLOUR_MAP: Record<KitVariant, { primary: ColourName; bg: ColourName[]; dataPrimary: ColourName }> = {
  home: { primary: "Wrexham Red", bg: ["White", "Wrexham Gold", "Forest"], dataPrimary: "White" },
  away: { primary: "Gold",        bg: ["Forest", "Wrexham Red", "White"],  dataPrimary: "Black" },
};

const LINE_EFFECTS = [
  { id: "default", label: "Default" },
  { id: "laser", label: "Laser" },
  { id: "flame", label: "Flame" },
  { id: "lightning", label: "Lightning" },
  { id: "ink", label: "Flow" },
  { id: "spray", label: "Spray" },
] as const;

/* ── Slider helper ──────────────────────────────────────────────────── */

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  displayVal,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayVal?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#888888]">{label}</span>
        <span className="tabular-nums text-white/60">{displayVal ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#DA291C] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#DA291C]"
      />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

function MerchPreviewContent() {
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId") ?? "";
  const initialStyle = searchParams.get("style") ?? "classic-home";
  const effect = searchParams.get("effect") ?? "default";
  const goalLabel = searchParams.get("goal") ?? "";
  const [matchId, setMatchId] = useState(searchParams.get("matchId") ?? "1377235");
  const [goalIndex, setGoalIndex] = useState(searchParams.get("goalIndex") ?? "6");
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const artUrlParam = (typeof window !== "undefined" ? localStorage.getItem("emotivx_merch_art") : null) ?? searchParams.get("artUrl") ?? "";

  const { addItem } = useCart();

  /* Product state */
  const [selectedProduct, setSelectedProduct] = useState<ProductLabel>("Hoodie");
  const [selectedSize, setSelectedSize] = useState<Size>("L");
  // Parse initial style into base + kit variant (needed before colour state)
  const _initBase = initialStyle.replace(/-home$/, "").replace(/-away$/, "");
  const _initKitVariant: KitVariant = initialStyle.endsWith("-away") ? "away" : "home";
  // ── Colour state ─────────────────────────────────────────────────
  // Apply kit colours on initial load
  const _initKitColours = KIT_COLOUR_MAP[_initKitVariant];
  const [selectedColour, setSelectedColour] = useState<ColourName>(_initKitColours.primary);
  const [bgColours, setBgColours]           = useState<ColourName[]>([]);   // additional bg colours
  const [dataColours, setDataColours]       = useState<ColourName[]>([]);   // legacy — kept for dep arrays
  const [dataLineColour, setDataLineColour]     = useState<ColourName | null>("White");  // glow + line - default white for Wrexham
  const [dataPointColour, setDataPointColour]   = useState<ColourName | null>("Forest");  // markers - default green for Wrexham
  const [colourPanelOpen, setColourPanelOpen] = useState<"base" | "data" | null>("base");
  const [advancedColours, setAdvancedColours] = useState(false);
  const [activePaletteSlot, setActivePaletteSlot] = useState(0); // 0=hero, 1-3=accent

  const toggleBgColour = (name: ColourName) =>
    setBgColours(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

  const toggleDataColour = (name: ColourName) =>
    setDataColours(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

  // Resolved bg extra: user picks, or Wrexham order minus primary
  const resolvedExtraColours = (
    bgColours.length > 0
      ? bgColours
      : WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour)
  ).map(name => COLOURS.find(c => c.name === name)!.hex);

  // Resolved palette accent names (ensure 3 for palette display)
  const paletteAccents = bgColours.length > 0
    ? [...bgColours, ...WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour && !bgColours.includes(c))].slice(0, 3)
    : WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour).slice(0, 3);

  // Resolved data primary: user picks first data colour, or luminance-opposite of bg primary
  const primaryHex = COLOURS.find(c => c.name === selectedColour)!.hex;
  const autoDataPrimary = getOppositeColour(primaryHex);
  const resolvedDataPrimary   = dataLineColour ?? autoDataPrimary;
  const resolvedDataSecondary = dataPointColour ?? selectedColour; // points default to bg primary
  const resolvedDataHexes     = [resolvedDataPrimary, resolvedDataSecondary].map(n => COLOURS.find(c => c.name === n)!.hex);

  // Secondaries kept as alias for dep array
  const secondaryColours = bgColours;
  const [selectedView, setSelectedView] = useState<GarmentView>("front");
  // Moment badge is always included — it's the unique identifier of every piece
  const includeBadge = true;
  // Player name + number on back — optional personalisation like a real shirt
  const [includeNameNumber, setIncludeNameNumber] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: number; dashboardUrl: string } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  /* Customisation state */
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [baseStyle, setBaseStyle] = useState<BaseStyleId>(_initBase as BaseStyleId);
  const [kitVariant, setKitVariant] = useState<KitVariant>(_initKitVariant);
  // Derived: composite style ID sent to art server (e.g. "classic-home")
  const artStyle = `${baseStyle}-${kitVariant}` as StyleId;

  // When style or kit changes, auto-apply palette
  const applyKitPalette = (kit: KitVariant) => {
    const colours = KIT_COLOUR_MAP[kit];
    setSelectedColour(colours.primary);
    setBgColours([...colours.bg]);
    setDataColours([]);
    setDataLineColour(null);
    setDataPointColour(null);
  };
  const handleStyleChange = (id: BaseStyleId) => {
    setBaseStyle(id);
  };
  const handleKitChange = (kit: KitVariant) => {
    setKitVariant(kit);
    applyKitPalette(kit);
  };
  const handlePaletteSlotChange = (slot: number, colour: ColourName) => {
    if (slot === 0) {
      setSelectedColour(colour);
      setDataLineColour(null);
      setDataPointColour(null);
    } else {
      const currentAccents = bgColours.length > 0
        ? [...bgColours, ...WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour && !bgColours.includes(c))].slice(0, 3)
        : [...WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour).slice(0, 3)];
      currentAccents[slot - 1] = colour;
      setBgColours(currentAccents);
    }
  };
  const [lineEffect, setLineEffect] = useState(effect);
  const [glowIntensity, setGlowIntensity] = useState(4);
  const [patternDensity, setPatternDensity] = useState(50);
  const [lineThickness, setLineThickness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [auraColour, setAuraColour] = useState<ColourName | null>(null);
  const [universalIntensity, setUniversalIntensity] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [showMarkers, setShowMarkers] = useState(true);
  const [markerSize, setMarkerSize] = useState(80);
  const [linkTransforms, setLinkTransforms] = useState(true);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(artUrlParam || null);
  const [regenerating, setRegenerating] = useState(false);

  /* Overlay texture — transparent PNG with logo + badge (non-tiling) */


  /* Team + scorer state */
  const [teamConfig, setTeamConfig] = useState<TeamConfig | null>(null);
  const [scorerName, setScorerName] = useState<string | null>(null);
  const [scorerNumber, setScorerNumber] = useState<number | null>(null);
  const [homeTeamName, setHomeTeamName] = useState<string | null>(null);
  const [awayTeamName, setAwayTeamName] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState<number | null>(null);
  const [awayScore, setAwayScore] = useState<number | null>(null);
  const [matchMinute, setMatchMinute] = useState<number | null>(null);
  const [stadiumName, setStadiumName] = useState<string | null>(null);
  const [matchDateStr, setMatchDateStr] = useState<string | null>(null);

  /* Load moment metadata (scorer + team) when matchId/goalIndex are available */
  useEffect(() => {
    if (!matchId) return;
    fetch(`/api/moments/meta?matchId=${matchId}&goalIndex=${goalIndex}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.scorerName) setScorerName(data.scorerName);
        if (data.scorerNumber != null) setScorerNumber(data.scorerNumber);
        if (data.homeTeam) {
          setHomeTeamName(data.homeTeam);
          const cfg = getTeam(data.homeTeam);
          if (cfg) setTeamConfig(cfg);
        }
        if (data.awayTeam) setAwayTeamName(data.awayTeam);
        if (data.homeScore != null) setHomeScore(data.homeScore);
        if (data.awayScore != null) setAwayScore(data.awayScore);
        if (data.minute != null) setMatchMinute(data.minute);
        if (data.stadium) setStadiumName(data.stadium);
        if (data.matchDate) setMatchDateStr(data.matchDate);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, goalIndex]);

  /* ── Fetch overlay texture (logo + badge) when team/view/name changes ── */


  const [textureControls, setTextureControls] = useState<TextureControls>(DEFAULT_TEXTURE_CONTROLS);
  const setTC = (key: keyof TextureControls) => (v: number) =>
    setTextureControls((c) => ({ ...c, [key]: v }));

  const [viewControls, setViewControls] = useState<ViewControls>(DEFAULT_VIEW_CONTROLS);
  const setVC = (key: keyof ViewControls) => (v: number) =>
    setViewControls((c) => ({ ...c, [key]: v }));

  /* Derived */
  const product = PRODUCTS.find((p) => p.label === selectedProduct)!;
  const LOGO_PRICE = 5;          // £5 for team crest on left chest
  const NAME_NUMBER_PRICE = 10;  // £10 for personalised name + number on back
  const totalPrice = product.price + (showLogo ? LOGO_PRICE : 0) + (includeNameNumber ? NAME_NUMBER_PRICE : 0);

  /* Fallback artwork URL if no artUrlParam and goalId exists */
  const displayArtworkUrl = artworkUrl || (goalId
    ? `/api/art/preview?goalId=${goalId}&style=${artStyle}&effect=${lineEffect}`
    : null);

  const placeholderGradient =
    "linear-gradient(135deg, #BA0C2F 0%, #0a0a0a 50%, #BA0C2F 100%)";

  /* ── Auto-regenerate on style/slider changes (debounced) ────────── */
  const regenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!matchId) return;
    if (regenTimerRef.current) clearTimeout(regenTimerRef.current);
    regenTimerRef.current = setTimeout(() => {
      handleRegenerate();
    }, 800);
    return () => { if (regenTimerRef.current) clearTimeout(regenTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStyle, kitVariant, lineEffect, glowIntensity, patternDensity, lineThickness, contrast, selectedView, matchId, goalIndex, selectedColour, bgColours, dataLineColour, dataPointColour, auraColour, universalIntensity, brightness, linkTransforms, showMarkers, markerSize]);

  /* ── Clear stale art + reset metadata when moment changes ──────── */
  useEffect(() => {
    if (matchId) {
      localStorage.removeItem("emotivx_merch_art");
      setArtworkUrl(null);
      setScorerName(null);
      setScorerNumber(null);
      setHomeTeamName(null);
      setAwayTeamName(null);
      setHomeScore(null);
      setAwayScore(null);
      setMatchMinute(null);
      setMatchDateStr(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, goalIndex]);

  /* ── Regenerate artwork ──────────────────────────────────────────── */
  const handleRegenerate = useCallback(async () => {
    if (!matchId) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/moments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: Number(matchId),
          goalIndex: Number(goalIndex),
          style: artStyle,
          bgDetail: patternDensity,
          dataDetail: 50,
          bloom: glowIntensity,
          intensity: contrast,
          dataScale: 80,
          buildupDepth: 35,   // show only final 35% of buildup — keeps path tight around goal
          format360: true,    // use real 360 match data (not synthetic fallback)
          edgeVisibility: lineThickness,
          width: 2048,
          // Kit palette — primary drives the dominant background fill
          kitPalette: {
            primary: primaryHex,
            secondary: resolvedExtraColours[0] ?? "#FFFFFF",
            accent: resolvedExtraColours[1] ?? "#C9A84C",
            background: "#0A0A0A",
          },
          // Logo + badge are now in a separate overlay texture (non-tiling)
          teamColour: teamConfig?.primaryColour ?? "#DA291C",
          dataPrimary:   COLOURS.find(c => c.name === resolvedDataPrimary)?.hex ?? null,
          dataSecondary: COLOURS.find(c => c.name === resolvedDataSecondary)?.hex ?? null,
          showMarkers: showMarkers,
          markerSize: markerSize,
          dataAccent:    resolvedDataHexes[2] ?? null,
          auraColour:    auraColour ? (COLOURS.find(c => c.name === auraColour)?.hex ?? null) : null,
          universalIntensity,
          brightness,
          linkTransforms,
          lineEffect,
          view: selectedView,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setArtworkUrl(data.imageUrl);
          // Update localStorage for persistence
          if (data.imageUrl.startsWith("http")) {
            localStorage.setItem("emotivx_merch_art", data.imageUrl);
          }
        }
      }
    } catch (err) {
      console.error("Regeneration failed:", err);
    } finally {
      setRegenerating(false);
    }
  }, [matchId, goalIndex, artStyle, baseStyle, kitVariant, patternDensity, glowIntensity, contrast, lineThickness, teamConfig, selectedView, resolvedExtraColours, resolvedDataPrimary, resolvedDataSecondary, resolvedDataHexes, primaryHex, lineEffect, auraColour, universalIntensity, brightness, linkTransforms]);

  function handleAddToCart() {
    addItem({
      momentId: goalId || "preview",
      momentName: goalId ? `Goal ${goalId}` : "Preview Moment",
      patternName: artStyle,
      lineEffect: lineEffect,
      customisation: { badge: "included" },
      productType: selectedProduct,
      size: product.hasSizes ? selectedSize : "One Size",
      quantity: 1,
      unitPrice: totalPrice,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  /* ── Place real Printful order (draft) ──────────────────────────── */
  async function handleOrderHoodie() {
    if (!artworkUrl) {
      setOrderError("Generate the art first — no artwork URL found.");
      return;
    }
    setOrdering(true);
    setOrderError(null);
    setOrderResult(null);
    try {
      // Variant ID map: S=10869 M=10870 L=10871 XL=10872 2XL=10873
      const sizeToVariant: Record<string, number> = {
        S: 10869, M: 10870, L: 10871, XL: 10872, "2XL": 10873, "3XL": 10874, "4XL": 10875,
      };
      const variantId = sizeToVariant[selectedSize] ?? 10871; // default L

      const res = await fetch("/api/printful/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkUrl,
          variantId,
          recipient: {
            name: "David",
            email: "david@motionpixel.co.uk",
            address1: "1 Main Street",
            city: "Stafford",
            state_code: "",
            country_code: "GB",
            zip: "ST1 1AA",
          },
          confirm: false, // DRAFT only — review in Printful dashboard before charging
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Order failed");
      setOrderResult({ orderId: data.orderId, dashboardUrl: data.dashboardUrl });
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : String(err));
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-2 sm:px-6 py-4 sm:py-10">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#888888]">
          Merch Preview
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Your Moment, Worn
        </h1>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        {/* ============ LEFT — Product Viewer + Product Grid ============ */}
        <div>
          <div className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a]" style={{ aspectRatio: "1/1" }}>
            {(product.productType === "hoodie" || product.productType === "tshirt" || product.productType === "longsleeve") ? (
              <div className="absolute inset-0 w-full h-full">
              <GarmentViewerWithFallback
                productType={product.productType}
                artworkUrl={displayArtworkUrl}
                loading={regenerating}
                height={undefined}
                className="w-full h-full"
                textureControls={textureControls}
                viewControls={viewControls}
                teamLogoUrl={teamConfig?.logoUrl}
                showLogo={showLogo}
                teamPrimaryColour={teamConfig?.primaryColour}
                badgeData={{
                  scorerName,
                  scorerNumber,
                  minute: matchMinute,
                  homeTeam: homeTeamName,
                  awayTeam: awayTeamName,
                  homeScore,
                  awayScore,
                  matchDate: matchDateStr,
                }}
                playerName={scorerName}
                playerNumber={scorerNumber}
                showNameNumber={includeNameNumber}
              />
            </div>
            ) : (
              <GarmentPreview
                productType={product.productType}
                view={selectedView}
                artworkUrl={displayArtworkUrl}
                placeholderGradient={placeholderGradient}
                loading={regenerating}
              />
            )}
          </div>

          {/* Front / Back toggle + personalisation (garments only) */}
          {product.hasViews && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <Slider label="Zoom" value={0.9 + 3.5 - viewControls.zoom} min={0.9} max={3.5} step={0.05} onChange={(v: number) => setVC("zoom")(0.9 + 3.5 - v)} displayVal={viewControls.zoom.toFixed(1)} />
                  <Slider label="Spin Speed" value={viewControls.spinSpeed} min={0} max={10} step={0.1} onChange={setVC("spinSpeed")} displayVal={viewControls.spinSpeed === 0 ? "Off" : `${viewControls.spinSpeed.toFixed(1)}×`} />
                </div>
              </div>
              {/* Team logo toggle */}
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#111111] px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Add team logo
                    <span className="ml-2 text-[#DA291C]">+£{LOGO_PRICE}</span>
                  </p>
                  <p className="text-[10px] text-[#888888]">Team crest on left chest</p>
                </div>
                <button
                  onClick={() => setShowLogo(!showLogo)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                    showLogo ? "bg-[#DA291C]" : "bg-white/10"
                  }`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    showLogo ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              {/* Name + number on back */}
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#111111] px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Add player name and number
                    <span className="ml-2 text-[#DA291C]">+£{NAME_NUMBER_PRICE}</span>
                  </p>
                  <p className="text-[10px] text-[#888888]">
                    {scorerName ? `${scorerName} · #${scorerNumber}` : "Scorer name + number"} · back of garment
                  </p>
                </div>
                <button
                  onClick={() => setIncludeNameNumber(!includeNameNumber)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                    includeNameNumber ? "bg-[#DA291C]" : "bg-white/10"
                  }`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    includeNameNumber ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
          )}

          {/* ── PRODUCT GRID — 4 cols mobile (3 rows), 6 cols desktop ── */}
          <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setSelectedProduct(p.label);
                  setSelectedView("front");
                }}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1 py-2.5 text-center transition-all sm:py-2 ${
                  selectedProduct === p.label
                    ? "scale-[1.03] border-[#DA291C] bg-[#DA291C]/10"
                    : "border-white/5 bg-[#111111] hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <span className="text-lg leading-none sm:text-base">{p.icon}</span>
                <span className={`text-[10px] font-semibold leading-tight ${
                  selectedProduct === p.label ? "text-white" : "text-gray-400"
                }`}>
                  {p.shortLabel}
                </span>
                <span className={`text-[9px] tabular-nums ${
                  selectedProduct === p.label ? "text-[#DA291C]" : "text-[#888888]"
                }`}>
                  £{p.price}
                </span>
              </button>
            ))}
          </div>

          {/* ── PRODUCT DETAILS ─────────────────────────────────── */}
          <div className="mt-6 rounded-xl border border-white/5 bg-[#111111] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#888888]">
              <Package className="h-3.5 w-3.5" />
              Product Details
            </h3>

            <p className="mb-4 text-sm leading-relaxed text-gray-300">
              {product.description}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <p className="mb-0.5 font-semibold text-white">Materials</p>
                <p className="text-[#888888]">{product.materials}</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold text-white">Sizing</p>
                <p className="text-[#888888]">{product.sizing}</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold text-white">Care</p>
                <p className="text-[#888888]">{product.care}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Truck className="h-3.5 w-3.5 flex-shrink-0 text-[#DA291C]" />
              <p className="text-[11px] text-[#888888]">
                Printed on demand by Printful · Ships in 5–7 days
              </p>
            </div>
          </div>
        </div>

        {/* ============ RIGHT — Product Options (40%) ============ */}
        <div className="space-y-5">
          {/* ── MOMENT BADGE ────────────────────────────────── */}
          <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
            <EditionCard
              scorerName={scorerName ?? "Unknown"}
              scorerNumber={scorerNumber}
              minute={matchMinute}
              homeTeam={homeTeamName ?? "Home"}
              awayTeam={awayTeamName ?? "Away"}
              homeScore={homeScore}
              awayScore={awayScore}
              matchDate={matchDateStr ?? ""}
              teamColour={teamConfig?.primaryColour ?? "#DA291C"}
              accentColour="#C9A84C"
            />
            <p className="mt-2 text-xs text-[#888888]">
              Style: <span className="capitalize text-white">{baseStyle}</span>
              {" · "}<span className="capitalize text-white/60">{kitVariant}</span>
              {lineEffect !== "default" && (
                <>
                  {" · "}Effect: <span className="capitalize text-white">{lineEffect}</span>
                </>
              )}
            </p>
          </div>

          {/* ── CUSTOMISE PANEL ─────────────────────────────── */}
          <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden">
              <div className="space-y-5 px-5 py-5">
                {/* ── 1. MOMENT — accordion by match ────────────── */}
                <Section title="Moment" defaultOpen={false}>
                  <div className="space-y-1">
                    {WREXHAM_MOMENTS.map((match) => {
                      const isExpanded = expandedMatches.has(match.matchId);
                      const isSelected = matchId === match.matchId;
                      return (
                        <div key={match.matchId} className="rounded-lg border border-white/5 overflow-hidden">
                          <button
                            onClick={() => setExpandedMatches(prev => {
                              const next = new Set(prev);
                              if (next.has(match.matchId)) next.delete(match.matchId);
                              else next.add(match.matchId);
                              return next;
                            })}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-medium transition-colors ${
                              isSelected ? "bg-white/5 text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                            }`}
                          >
                            <span className="truncate pr-2">{match.label}</span>
                            <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {isExpanded && (
                            <div className="border-t border-white/5 px-2 py-2 flex flex-col gap-1">
                              {match.goals.map((g) => {
                                const active = matchId === match.matchId && goalIndex === String(g.index);
                                return (
                                  <button
                                    key={g.index}
                                    onClick={() => { setMatchId(match.matchId); setGoalIndex(String(g.index)); }}
                                    className={`rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                                      active
                                        ? "bg-[#DA291C] text-white"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                  >
                                    {g.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* ── 2. STYLE — Home/Away toggle + 3×3 grid ─────── */}
                <Section title="Style" defaultOpen={false}>
                  {/* Home / Away pill + Specials */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex rounded-full border border-white/10 p-0.5">
                      {(["home", "away"] as const).map((kit) => (
                        <button
                          key={kit}
                          onClick={() => handleKitChange(kit)}
                          className={`rounded-full px-4 py-1 text-[11px] font-semibold capitalize transition-colors ${
                            kitVariant === kit
                              ? "bg-[#DA291C] text-white"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {kit}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled
                      className="rounded-full border border-white/5 px-3 py-1 text-[10px] font-medium text-gray-600 cursor-not-allowed"
                    >
                      Specials — Coming Soon
                    </button>
                  </div>
                  {/* 3×3 style grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {ART_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleStyleChange(s.id)}
                        className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                          baseStyle === s.id
                            ? "bg-[#DA291C] text-white"
                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── 3. COLOURS ─────────────────────────────────── */}
                <Section title="Colours" defaultOpen={false}>
                  <div className="space-y-4">
                    {!advancedColours ? (
                      /* ── Simplified team palette (hero + 3 accents) ── */
                      <div className="space-y-3">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">Team Palette</p>
                        <div className="flex items-end gap-3">
                          {[
                            { slot: 0, label: "Hero",     size: "h-14 w-14" },
                            { slot: 1, label: "Accent 1", size: "h-10 w-10" },
                            { slot: 2, label: "Accent 2", size: "h-10 w-10" },
                            { slot: 3, label: "Accent 3", size: "h-10 w-10" },
                          ].map(({ slot, label, size }) => {
                            const name = slot === 0 ? selectedColour : paletteAccents[slot - 1];
                            const hex = COLOURS.find(c => c.name === name)?.hex ?? "#333";
                            return (
                              <button key={slot} onClick={() => setActivePaletteSlot(slot)}
                                className="flex flex-col items-center gap-1">
                                <p className="text-[8px] uppercase tracking-widest text-[#555]">{label}</p>
                                <div className={`${size} rounded-full border-2 transition-all ${activePaletteSlot === slot ? "border-white ring-2 ring-white/20 scale-110" : "border-white/10 hover:border-white/30"}`}
                                  style={{ backgroundColor: hex }} />
                                <span className="max-w-[60px] truncate text-[9px] text-[#666]">{name}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Colour picker grid for active slot */}
                        <div className="grid grid-cols-4 gap-x-2 gap-y-3 pt-1">
                          {COLOURS.map((c) => {
                            const isActive = activePaletteSlot === 0
                              ? selectedColour === c.name
                              : paletteAccents[activePaletteSlot - 1] === c.name;
                            return (
                              <button key={c.name} onClick={() => handlePaletteSlotChange(activePaletteSlot, c.name)}
                                className="group flex flex-col items-center gap-1">
                                <div className={`h-9 w-9 rounded-full border-2 transition ${isActive ? "border-[#BA0C2F] ring-2 ring-[#BA0C2F]/30" : "border-white/10 group-hover:border-white/30"}`}
                                  style={{ backgroundColor: c.hex }} />
                                <span className={`text-center text-[10px] leading-tight ${isActive ? "text-white" : "text-[#888888]"}`}>{c.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* ── Advanced: full colour pickers ── */
                      <>
                        <div>
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Primary — majority colour</p>
                          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                            {COLOURS.map((c) => (
                              <button key={c.name} onClick={() => { setSelectedColour(c.name); setDataLineColour(null); setDataPointColour(null); }}
                                className="group flex flex-col items-center gap-1">
                                <div className={`h-9 w-9 rounded-full border-2 transition ${selectedColour === c.name ? "border-[#BA0C2F] ring-2 ring-[#BA0C2F]/30" : "border-white/10 group-hover:border-white/30"}`}
                                  style={{ backgroundColor: c.hex }} />
                                <span className={`text-center text-[10px] leading-tight ${selectedColour === c.name ? "text-white" : "text-[#888888]"}`}>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">Additional — blend into background</p>
                            {bgColours.length > 0 && (
                              <button onClick={() => setBgColours([])} className="text-[9px] text-[#555] hover:text-[#888] transition-colors">Reset</button>
                            )}
                          </div>
                          {bgColours.length === 0 && (
                            <p className="mb-2 text-[9px] text-[#444]">Auto: {WREXHAM_SECONDARY_ORDER.filter(c => c !== selectedColour).slice(0, 3).join(" · ")}</p>
                          )}
                          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                            {COLOURS.filter(c => c.name !== selectedColour).map((c) => {
                              const active = bgColours.includes(c.name);
                              const order  = bgColours.indexOf(c.name);
                              return (
                                <button key={c.name} onClick={() => toggleBgColour(c.name)}
                                  className="group relative flex flex-col items-center gap-1">
                                  <div className="relative">
                                    <div className={`h-9 w-9 rounded-full border-2 transition ${active ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/30" : "border-white/10 group-hover:border-white/30"}`}
                                      style={{ backgroundColor: c.hex }} />
                                    {active && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A84C] text-[9px] font-black text-black">{order + 1}</span>}
                                  </div>
                                  <span className={`text-center text-[10px] leading-tight ${active ? "text-[#C9A84C]" : "text-[#888888]"}`}>{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Advanced / Simple toggle */}
                    <button
                      onClick={() => setAdvancedColours(!advancedColours)}
                      className="w-full rounded-lg border border-white/5 py-2 text-[10px] font-medium text-[#666] transition hover:border-white/10 hover:text-[#999]"
                    >
                      {advancedColours ? "\u2190 Simple Palette" : "Advanced \u2192"}
                    </button>
                  </div>
                </Section>

                {/* ── 4. BACKGROUND ──────────────────────────────── */}
                <Section title="Background Customisation" defaultOpen={false}>
                  <div className="space-y-3">
                    <Slider label="Pattern Density" value={patternDensity} onChange={setPatternDensity} />
                    <Slider label="Contrast" value={contrast} onChange={setContrast} />
                  </div>
                </Section>

                {/* ── 5. DATA LINE — effect, colour, points ──────── */}
                <Section title="Data Line Customisation" defaultOpen={false}>
                  <div className="space-y-4">
                    {/* Effect picker */}
                    <div>
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Effect</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LINE_EFFECTS.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setLineEffect(e.id)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                              lineEffect === e.id
                                ? "bg-[#DA291C] text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Line colour */}
                    <div>
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Line Colour</p>
                      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                        {COLOURS.map((c) => (
                          <button key={c.name} onClick={() => setDataLineColour(dataLineColour === c.name ? null : c.name)}
                            className="group flex flex-col items-center gap-1">
                            <div className={`h-9 w-9 rounded-full border-2 transition ${resolvedDataPrimary === c.name ? "border-white ring-2 ring-white/20" : "border-white/10 group-hover:border-white/30"}`}
                              style={{ backgroundColor: c.hex }} />
                            <span className={`text-center text-[10px] leading-tight ${resolvedDataPrimary === c.name ? "text-white" : "text-[#888888]"}`}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                      {!dataLineColour && <p className="mt-2 text-[9px] text-[#444]">Auto: {autoDataPrimary} (opposite of background)</p>}
                    </div>
                    {/* Points colour */}
                    <div>
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Points Colour</p>
                      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                        {COLOURS.map((c) => (
                          <button key={c.name} onClick={() => setDataPointColour(dataPointColour === c.name ? null : c.name)}
                            className="group flex flex-col items-center gap-1">
                            <div className={`h-9 w-9 rounded-full border-2 transition ${resolvedDataSecondary === c.name ? "border-white ring-2 ring-white/20" : "border-white/10 group-hover:border-white/30"}`}
                              style={{ backgroundColor: c.hex }} />
                            <span className={`text-center text-[10px] leading-tight ${resolvedDataSecondary === c.name ? "text-white" : "text-[#888888]"}`}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                      {!dataPointColour && <p className="mt-2 text-[9px] text-[#444]">Auto: {selectedColour} (matches background primary)</p>}
                    </div>
                    {/* Aura colour */}
                    <div>
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Aura / Glow Colour</p>
                      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                        {COLOURS.map((c) => (
                          <button key={c.name} onClick={() => setAuraColour(auraColour === c.name ? null : c.name)}
                            className="group flex flex-col items-center gap-1">
                            <div className={`h-9 w-9 rounded-full border-2 transition ${(auraColour ?? resolvedDataPrimary) === c.name ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/30" : "border-white/10 group-hover:border-white/30"}`}
                              style={{ backgroundColor: c.hex }} />
                            <span className={`text-center text-[10px] leading-tight ${(auraColour ?? resolvedDataPrimary) === c.name ? "text-[#C9A84C]" : "text-[#888888]"}`}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                      {!auraColour && <p className="mt-2 text-[9px] text-[#444]">Auto: matches line colour</p>}
                    </div>
                    {/* Line sliders */}
                    <Slider label="Aura Intensity" value={glowIntensity} onChange={setGlowIntensity} />
                    <Slider label="Line Thickness" value={lineThickness} onChange={setLineThickness} />
                    <Slider label="Universal Intensity" value={universalIntensity} onChange={setUniversalIntensity} />
                    <Slider label="Brightness" value={brightness} onChange={setBrightness} />
                    {/* Data point controls */}
                    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-white">Show data points</p>
                        <p className="text-[10px] text-[#888888]">Display markers along the line</p>
                      </div>
                      <button
                        onClick={() => setShowMarkers(!showMarkers)}
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                          showMarkers ? "bg-[#DA291C]" : "bg-white/10"
                        }`}
                      >
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          showMarkers ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                    {showMarkers && <Slider label="Data Point Size" value={markerSize} onChange={setMarkerSize} />}
                    {/* Link transforms toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-white">Link transforms</p>
                        <p className="text-[10px] text-[#888888]">Background &amp; data move together</p>
                      </div>
                      <button
                        onClick={() => setLinkTransforms(!linkTransforms)}
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                          linkTransforms ? "bg-[#DA291C]" : "bg-white/10"
                        }`}
                      >
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          linkTransforms ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  </div>
                </Section>

                {/* ── 6. GARMENT — viewport + pattern (3D products only) ── */}
                {(selectedProduct === "Hoodie" || selectedProduct === "T-Shirt" || selectedProduct === "Long Sleeve") && (
                  <Section title="Advanced Garment Customisation" defaultOpen={false}>
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#666]">Pattern on Garment</p>
                        <div className="space-y-2">
                          <Slider label="Repeat" value={textureControls.repeat} min={1} max={8} step={0.5} onChange={setTC("repeat")} displayVal={`${textureControls.repeat}×`} />
                          <Slider label="Rotation" value={textureControls.rotation} min={0} max={360} step={1} onChange={setTC("rotation")} displayVal={`${textureControls.rotation}°`} />
                          <Slider label="Offset X" value={textureControls.offsetX} min={0} max={1} step={0.01} onChange={setTC("offsetX")} displayVal={textureControls.offsetX.toFixed(2)} />
                          <Slider label="Offset Y" value={textureControls.offsetY} min={0} max={1} step={0.01} onChange={setTC("offsetY")} displayVal={textureControls.offsetY.toFixed(2)} />
                          <Slider label="Brightness" value={textureControls.brightness} min={0.4} max={2.0} step={0.05} onChange={setTC("brightness")} displayVal={textureControls.brightness.toFixed(2)} />
                          <button
                            className="w-full rounded-lg border border-white/8 py-1.5 text-[11px] text-white/40 transition hover:text-white/60"
                            onClick={() => setTextureControls(DEFAULT_TEXTURE_CONTROLS)}
                          >
                            Reset pattern
                          </button>
                        </div>
                      </div>
                    </div>
                  </Section>
                )}

                {/* Regenerate button */}
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || !matchId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-40"
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Generating…" : "Regenerate"}
                </button>
                {!matchId && (
                  <p className="text-center text-[10px] text-[#888888]">
                    Regeneration requires a match — go back and pick a moment first
                  </p>
                )}
              </div>
          </div>

          {/* ── SIZE (garments only) ──────────────────────────── */}
          {product.hasSizes && (
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
                  Size
                </h3>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#888888] transition hover:text-white"
                >
                  <Info className="h-3 w-3" />
                  Size Guide
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                      selectedSize === size
                        ? "bg-[#DA291C] text-white"
                        : "border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}



          {/* ── MOMENT BADGE ─────────────────────────────────── */}
          {/* Edition badge section removed — EditionCard is now at top of panel */}

          {/* ── PRICE ────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#888888]">
              Price
            </h3>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#888888]">
                <span>{selectedProduct}</span>
                <span className="text-white">£{product.price}</span>
              </div>
              <div className="flex justify-between text-[#888888]">
                <span>Moment Badge</span>
                <span className="text-[#DA291C] text-xs font-semibold">Included</span>
              </div>
              {showLogo && (
                <div className="flex justify-between text-[#888888]">
                  <span>Team logo</span>
                  <span className="text-white">£{LOGO_PRICE}</span>
                </div>
              )}
              {includeNameNumber && (
                <div className="flex justify-between text-[#888888]">
                  <span>Player name &amp; number</span>
                  <span className="text-white">£{NAME_NUMBER_PRICE}</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-2">
                <div className="flex justify-between font-bold text-white">
                  <span>Total</span>
                  <span className="text-lg">£{totalPrice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ADD TO CART ──────────────────────────────────── */}
          <button
            onClick={handleAddToCart}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-colors ${
              addedToCart
                ? "bg-green-600"
                : "bg-[#DA291C] hover:bg-[#b82318]"
            }`}
          >
            {addedToCart ? (
              <>
                <Check className="h-5 w-5" />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </>
            )}
          </button>

          {/* ── ORDER HOODIE (real Printful draft) ───────────── */}
          <button
            onClick={handleOrderHoodie}
            disabled={ordering || !artworkUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DA291C]/40 py-3 text-sm font-bold text-[#DA291C] transition-colors hover:bg-[#DA291C]/10 disabled:opacity-40"
          >
            {ordering ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Placing order…</>
            ) : (
              <><Truck className="h-4 w-4" /> Order Hoodie (Draft)</>
            )}
          </button>

          {orderResult && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-400">
              ✅ Draft order #{orderResult.orderId} created!{" "}
              <a href={orderResult.dashboardUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">
                Review &amp; confirm in Printful →
              </a>
            </div>
          )}

          {orderError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
              ❌ {orderError}
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#888888]">
            <Truck className="h-3.5 w-3.5" />
            Printed and shipped by Printful · 5–7 business days
          </p>
        </div>
      </div>

      {/* ── Size Guide Modal ──────────────────────────────────── */}
      {sizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-xl border border-white/10 bg-[#111111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="absolute right-4 top-4 text-[#888888] transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-sm font-bold">Size Guide</h2>

            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-3 py-2 text-left text-[#888888]">Size</th>
                    <th className="px-3 py-2 text-left text-[#888888]">Chest</th>
                    <th className="px-3 py-2 text-left text-[#888888]">Length</th>
                    <th className="px-3 py-2 text-left text-[#888888]">Sleeve</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SIZE_GUIDE).map(([size, measurements]) => (
                    <tr
                      key={size}
                      className={`border-b border-white/5 ${
                        selectedSize === size ? "bg-[#DA291C]/10 text-white" : "text-[#888888]"
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold text-white">{size}</td>
                      <td className="px-3 py-2">{measurements.Chest}</td>
                      <td className="px-3 py-2">{measurements.Length}</td>
                      <td className="px-3 py-2">{measurements.Sleeve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[10px] text-[#888888]">
              Measurements are approximate. When in doubt, size up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page-level error boundary — prevents white screen on crash ───────── */
class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(e: Error) {
    console.error("[MerchPreview] Page crash:", e.message);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white gap-4">
          <p className="text-lg">Something went wrong</p>
          <p className="text-sm text-zinc-400 max-w-md text-center">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); }}
            className="px-6 py-2 bg-[#DA291C] rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MerchPreviewPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Loading...</div>}>
        <MerchPreviewContent />
      </Suspense>
    </PageErrorBoundary>
  );
}
