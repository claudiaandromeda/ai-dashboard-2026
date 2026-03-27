"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { DEFAULT_TEXTURE_CONTROLS } from "@/components/merch/GarmentViewer3D";

const GarmentViewerWithFallback = dynamic(
  () => import("@/components/merch/GarmentViewerWithFallback"),
  { ssr: false }
);
import { User, Package, Sparkles, Shield, Heart, Settings, ChevronRight, Crown, Flame, Star, Zap } from "lucide-react";

type Tab = "purchases" | "digital-assets" | "profile" | "club";

const DEMO_USER = {
  name: "Jamie Davies",
  email: "jamie@wrexhamfan.com",
  club: "Wrexham AFC",
  memberSince: "February 2025",
  avatar: "JD",
};

const PURCHASES = [
  {
    id: "p1",
    moment: "Windass 80' vs Sheff Utd",
    product: "Hoodie",
    rarity: "Legendary",
    rarityColor: "#F59E0B",
    rarityIcon: Crown,
    edition: "#3 of 5",
    price: "£1,580",
    date: "Nov 12, 2024",
    status: "Delivered",
    hasDigital: true,
    image: "/purchase-legendary.jpg",
  },
  {
    id: "p2",
    moment: "Dalby 18' vs Birmingham",
    product: "T-Shirt",
    rarity: "Rare",
    rarityColor: "#3B82F6",
    rarityIcon: Zap,
    edition: "#34 of 75",
    price: "£198",
    date: "Sep 20, 2024",
    status: "Delivered",
    hasDigital: true,
    image: "/purchase-rare.jpg",
  },
  {
    id: "p3",
    moment: "Lee 55' vs Rotherham",
    product: "Phone Case",
    rarity: "Common",
    rarityColor: "#9CA3AF",
    rarityIcon: Package,
    edition: "#182 of 500",
    price: "£25",
    date: "Aug 22, 2024",
    status: "Delivered",
    hasDigital: true,
    image: "/purchase-common.jpg",
  },
];

const DIGITAL_ASSETS = [
  {
    id: "d1",
    name: "Mullin 11' — Legendary Avatar",
    type: "Player Avatar",
    rarity: "Legendary",
    rarityColor: "#F59E0B",
    linkedTo: "Hoodie #3/5",
    mintDate: "Nov 12, 2024",
    image: "/printful-test-front.png",
    animated: true,
    redeemIcon: "🎟️",
    redeemLabel: "Season ticket for next season",
    redeemBg: "bg-gradient-to-r from-[#F59E0B]/20 to-[#D97706]/20",
    redeemBorder: "border-[#F59E0B]/30",
    redeemText: "text-[#F59E0B]",
  },
  {
    id: "d2",
    name: "Dalby 18' — Rare Data Art",
    type: "Data Line Art",
    rarity: "Rare",
    rarityColor: "#3B82F6",
    linkedTo: "T-Shirt #34/75",
    mintDate: "Sep 20, 2024",
    image: "/purchase-rare.jpg",
    animated: false,
    redeemIcon: "🏟️",
    redeemLabel: "Tunnel experience with the team",
    redeemBg: "bg-gradient-to-r from-[#3B82F6]/20 to-[#2563EB]/20",
    redeemBorder: "border-[#3B82F6]/30",
    redeemText: "text-[#3B82F6]",
  },
  {
    id: "d3",
    name: "Lee 55' — Standard Avatar",
    type: "Player Avatar",
    rarity: "Common",
    rarityColor: "#9CA3AF",
    linkedTo: "Phone Case #182/500",
    mintDate: "Aug 22, 2024",
    image: "/textures-v2/001-dramatic-electric-lightning-storm-with-v.png",
    animated: false,
    redeemIcon: "🛍️",
    redeemLabel: "20% off any purchase over £20 at the Club Shop",
    redeemBg: "bg-gradient-to-r from-[#CD7F32]/20 to-[#A0522D]/20",
    redeemBorder: "border-[#CD7F32]/30",
    redeemText: "text-[#CD7F32]",
  },
];

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("purchases");
  const [liveArtUrl, setLiveArtUrl] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("emotivx_merch_art");
    if (stored) setLiveArtUrl(stored);
  }, []);

  const TABS: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "purchases", label: "My Purchases", icon: Package },
    { id: "digital-assets", label: "Digital Assets", icon: Sparkles },
    { id: "club", label: "My Club", icon: Shield },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-[#BA0C2F] flex items-center justify-center shrink-0">
            <span className="font-display text-2xl font-bold text-white">{DEMO_USER.avatar}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{DEMO_USER.name}</h1>
            <p className="text-sm text-[#888888]">{DEMO_USER.email} · Member since {DEMO_USER.memberSince}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative h-4 w-4">
                <Image src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png" alt="Wrexham" fill className="object-contain" />
              </div>
              <span className="text-xs font-semibold text-[#BA0C2F]">{DEMO_USER.club} Fan</span>
            </div>
          </div>
          <div className="ml-auto hidden sm:flex gap-3 text-center">
            {[
              { v: PURCHASES.length, l: "Purchases" },
              { v: DIGITAL_ASSETS.length, l: "Digital Assets" },
              { v: `£${PURCHASES.reduce((s, p) => s + parseFloat(p.price.replace("£", "").replace(",", "")), 0).toLocaleString()}`, l: "Total Spent" },
            ].map(s => (
              <div key={s.l} className="rounded-xl border border-white/5 bg-[#111111] px-4 py-3">
                <p className="text-xl font-bold text-white">{s.v}</p>
                <p className="text-[10px] text-[#555555]">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5 mb-6 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition whitespace-nowrap shrink-0 ${active ? "text-white" : "text-[#888888] hover:text-white/70"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#BA0C2F]" />}
              </button>
            );
          })}
        </div>

        {/* Purchases tab */}
        {tab === "purchases" && (
          <div className="space-y-4">
            {PURCHASES.map(p => {
              const Icon = p.rarityIcon;
              return (
                <div key={p.id} className="rounded-xl border border-white/5 bg-[#111111] p-5 flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-white/5">
                    <Image src={p.image} alt={p.moment} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{p.moment}</p>
                        <p className="text-xs text-[#888888]">{p.product} · {p.edition}</p>
                      </div>
                      <p className="text-sm font-bold text-white shrink-0">{p.price}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3" style={{ color: p.rarityColor }} />
                        <span className="text-[10px] font-bold" style={{ color: p.rarityColor }}>{p.rarity}</span>
                      </div>
                      <span className="text-[10px] text-[#555555]">{p.date}</span>
                      <span className="text-[10px] text-[#10B981]">✓ {p.status}</span>
                    </div>
                    {p.hasDigital && (
                      <button
                        onClick={() => setTab("digital-assets")}
                        className="mt-2 flex items-center gap-1.5 text-[10px] text-[#C9A84C] hover:underline"
                      >
                        <Sparkles className="h-3 w-3" /> View paired digital asset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <Link
              href="/merch-preview?team=wrexham"
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-4 text-sm text-[#555555] hover:text-white hover:border-white/20 transition"
            >
              + Shop more Wrexham moments
            </Link>
          </div>
        )}

        {/* Digital Assets tab */}
        {tab === "digital-assets" && (
          <div className="space-y-4">
            {/* Phygital explainer */}
            <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-[#C9A84C] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#C9A84C] mb-0.5">Your Phygital Collection</p>
                <p className="text-xs text-[#888888]">
                  Every purchase includes a paired digital twin — permanently linked to your physical item.
                  These are yours forever. Display them, share them, or hold them.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {DIGITAL_ASSETS.map(asset => (
                <div key={asset.id} className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden group flex flex-col">
                  {asset.id === "d1" ? (
                    <div className="w-full h-[260px] rounded-xl overflow-hidden bg-black">
                      <GarmentViewerWithFallback
                        productType="hoodie"
                        artworkUrl={liveArtUrl ?? "/textures-v2/001-neon-laser-beam-glow-on-pure-black-backg.png"}
                        textureControls={DEFAULT_TEXTURE_CONTROLS}
                        viewControls={{ zoom: 1.9, spinSpeed: 0.5 }}
                        badgeData={{
                          scorerName: "WINDASS",
                          scorerNumber: 10,
                          minute: 80,
                          homeTeam: "Wrexham",
                          awayTeam: "Sheff Utd",
                          homeScore: 2,
                          awayScore: 1,
                          matchDate: "2024",
                        }}
                        playerName="WINDASS"
                        playerNumber={10}
                        showNameNumber={true}
                        showLogo={true}
                        logoUrl="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
                        teamColour="#BA0C2F"
                        height={260}
                      />
                    </div>
                  ) : asset.id === "d2" ? (
                    <div className="w-full h-[260px] rounded-xl overflow-hidden bg-black">
                      <GarmentViewerWithFallback
                        productType="tshirt"
                        artworkUrl="/textures-v2/001-intense-neon-laser-beam-on-pure-bl.png"
                        textureControls={DEFAULT_TEXTURE_CONTROLS}
                        viewControls={{ zoom: 1.9, spinSpeed: 0.5 }}
                        badgeData={{
                          scorerName: "DALBY",
                          scorerNumber: 9,
                          minute: 18,
                          homeTeam: "Wrexham",
                          awayTeam: "Birmingham",
                          homeScore: 1,
                          awayScore: 0,
                          matchDate: "2024",
                        }}
                        playerName="DALBY"
                        playerNumber={9}
                        showNameNumber={true}
                        showLogo={true}
                        logoUrl="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
                        teamColour="#BA0C2F"
                        height={260}
                      />
                    </div>
                  ) : asset.id === "d3" ? (
                    <div className="relative w-full h-[260px] bg-black rounded-xl flex items-center justify-center">
                      <div className="relative w-28 h-48 rounded-2xl border-2 border-white/20 overflow-hidden bg-zinc-900 shadow-2xl">
                        {/* Screen with artwork */}
                        <img src="/textures-v2/001-dramatic-electric-lightning-storm-with-v.png" alt="Phone Case Art" className="w-full h-full object-cover opacity-80" />
                        {/* Phone notch */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black rounded-full" />
                      </div>
                      {/* Phone case label */}
                      <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="text-[10px] text-[#444] uppercase tracking-widest">Limited Edition · #182/500</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-square">
                      <Image src={asset.image} alt={asset.name} fill className="object-cover" />
                      {asset.animated && (
                        <div className="absolute top-2 right-2 rounded-full bg-[#F59E0B] px-2 py-0.5 text-[9px] font-bold text-black">
                          ANIMATED
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-xs font-bold text-white leading-tight">{asset.name}</p>
                        <p className="text-[10px] text-[#888888]">{asset.type}</p>
                      </div>
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold" style={{ color: asset.rarityColor }}>{asset.rarity}</span>
                      <span className="text-[#555555]">Minted {asset.mintDate}</span>
                    </div>
                    {/* Redeemable Value */}
                    <div className={`rounded-lg border ${asset.redeemBorder} ${asset.redeemBg} p-2.5 min-h-[172px]`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#888888] mb-1">Redeemable Value</p>
                      <div className="flex items-start gap-1.5">
                        <span className="text-sm leading-none">{asset.redeemIcon}</span>
                        <p className={`text-[11px] font-semibold leading-tight ${asset.redeemText}`}>{asset.redeemLabel}</p>
                      </div>
                      {/* Season ticket image (Legendary card) */}
                      {asset.id === "d1" && (
                        <div className="mt-2 rounded-lg overflow-hidden h-24 relative">
                          <img src="/season-ticket.png" alt="Season Ticket" className="w-full h-full object-cover rounded-lg" />
                        </div>
                      )}
                      {/* Tunnel experience image (Rare card) */}
                      {asset.id === "d2" && (
                        <div className="mt-2 rounded-lg overflow-hidden h-24 relative">
                          <img src="/tunnel-experience.png" alt="Tunnel Experience" className="w-full h-full object-cover rounded-lg" />
                        </div>
                      )}
                      {/* QR code digital twin (Common card) */}
                      {asset.id === "d3" && (
                        <div className="mt-2 flex flex-col items-center gap-1.5">
                          <div className="rounded-lg border border-[#CD7F32]/30 bg-white p-1.5">
                            <svg width="64" height="64" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                              {/* QR finder patterns (corners) */}
                              <rect x="4" y="4" width="20" height="20" rx="2" stroke="#222" strokeWidth="3" fill="none" />
                              <rect x="8" y="8" width="12" height="12" rx="1" fill="#222" />
                              <rect x="56" y="4" width="20" height="20" rx="2" stroke="#222" strokeWidth="3" fill="none" />
                              <rect x="60" y="8" width="12" height="12" rx="1" fill="#222" />
                              <rect x="4" y="56" width="20" height="20" rx="2" stroke="#222" strokeWidth="3" fill="none" />
                              <rect x="8" y="60" width="12" height="12" rx="1" fill="#222" />
                              {/* Data modules row 1 */}
                              <rect x="28" y="4" width="4" height="4" fill="#222" />
                              <rect x="36" y="4" width="4" height="4" fill="#222" />
                              <rect x="44" y="4" width="4" height="4" fill="#222" />
                              <rect x="28" y="12" width="4" height="4" fill="#222" />
                              <rect x="40" y="12" width="4" height="4" fill="#222" />
                              <rect x="48" y="12" width="4" height="4" fill="#222" />
                              <rect x="32" y="20" width="4" height="4" fill="#222" />
                              <rect x="44" y="20" width="4" height="4" fill="#222" />
                              {/* Data modules row 2 */}
                              <rect x="4" y="28" width="4" height="4" fill="#222" />
                              <rect x="12" y="28" width="4" height="4" fill="#222" />
                              <rect x="20" y="28" width="4" height="4" fill="#222" />
                              <rect x="32" y="28" width="4" height="4" fill="#222" />
                              <rect x="40" y="28" width="4" height="4" fill="#222" />
                              <rect x="52" y="28" width="4" height="4" fill="#222" />
                              <rect x="60" y="28" width="4" height="4" fill="#222" />
                              <rect x="72" y="28" width="4" height="4" fill="#222" />
                              {/* Data modules row 3 */}
                              <rect x="8" y="36" width="4" height="4" fill="#222" />
                              <rect x="16" y="36" width="4" height="4" fill="#222" />
                              <rect x="28" y="36" width="4" height="4" fill="#222" />
                              <rect x="36" y="36" width="4" height="4" fill="#222" />
                              <rect x="48" y="36" width="4" height="4" fill="#222" />
                              <rect x="56" y="36" width="4" height="4" fill="#222" />
                              <rect x="68" y="36" width="4" height="4" fill="#222" />
                              {/* Data modules row 4 */}
                              <rect x="4" y="44" width="4" height="4" fill="#222" />
                              <rect x="16" y="44" width="4" height="4" fill="#222" />
                              <rect x="24" y="44" width="4" height="4" fill="#222" />
                              <rect x="36" y="44" width="4" height="4" fill="#222" />
                              <rect x="44" y="44" width="4" height="4" fill="#222" />
                              <rect x="56" y="44" width="4" height="4" fill="#222" />
                              <rect x="64" y="44" width="4" height="4" fill="#222" />
                              <rect x="72" y="44" width="4" height="4" fill="#222" />
                              {/* Data modules row 5 */}
                              <rect x="28" y="52" width="4" height="4" fill="#222" />
                              <rect x="40" y="52" width="4" height="4" fill="#222" />
                              <rect x="48" y="52" width="4" height="4" fill="#222" />
                              <rect x="60" y="52" width="4" height="4" fill="#222" />
                              <rect x="72" y="52" width="4" height="4" fill="#222" />
                              {/* Data modules row 6 */}
                              <rect x="28" y="60" width="4" height="4" fill="#222" />
                              <rect x="36" y="60" width="4" height="4" fill="#222" />
                              <rect x="48" y="60" width="4" height="4" fill="#222" />
                              <rect x="56" y="60" width="4" height="4" fill="#222" />
                              <rect x="68" y="60" width="4" height="4" fill="#222" />
                              {/* Data modules row 7 */}
                              <rect x="28" y="68" width="4" height="4" fill="#222" />
                              <rect x="40" y="68" width="4" height="4" fill="#222" />
                              <rect x="52" y="68" width="4" height="4" fill="#222" />
                              <rect x="60" y="68" width="4" height="4" fill="#222" />
                              <rect x="72" y="68" width="4" height="4" fill="#222" />
                            </svg>
                          </div>
                          <p className="text-[9px] text-[#888] text-center leading-tight">Scan at Club Shop checkout · 20% off orders over £20</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="px-3 pb-3 space-y-2">
                    <p className="text-[10px] text-[#555555]">Linked to: {asset.linkedTo}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 rounded border border-white/10 py-1.5 text-[10px] text-[#888888] hover:text-white transition">Share</button>
                      <button className="flex-1 rounded border border-white/10 py-1.5 text-[10px] text-[#888888] hover:text-white transition">Display</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Club tab */}
        {tab === "club" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#BA0C2F]/20 bg-[#BA0C2F]/5 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative h-16 w-16">
                  <Image src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png" alt="Wrexham" fill className="object-contain" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Wrexham AFC</p>
                  <p className="text-sm text-[#888888]">Your supported club · League One 2024/25</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-center">
                {[
                  { v: "3", l: "Moments collected" },
                  { v: "#3", l: "Legendary holder" },
                  { v: "Top 5%", l: "Fan rank" },
                ].map(s => (
                  <div key={s.l} className="rounded-lg bg-black/20 p-3">
                    <p className="text-2xl font-bold text-white">{s.v}</p>
                    <p className="text-[10px] text-[#555555]">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <button disabled className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-[#555] cursor-not-allowed">
              <span>+ Add Another Club</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#444]">Coming Soon</span>
            </button>
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">Change Club</p>
              <p className="text-xs text-[#555555] mb-3">Your club setting personalises your homepage and merch recommendations.</p>
              <button className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white hover:bg-white/5 transition">Change Club</button>
            </div>
          </div>
        )}

        {/* Profile tab */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
              {[
                { label: "Full Name", value: DEMO_USER.name },
                { label: "Email", value: DEMO_USER.email },
                { label: "Member Since", value: DEMO_USER.memberSince },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-xs text-[#555555]">{f.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{f.value}</span>
                    <button className="text-[10px] text-[#BA0C2F] hover:underline">Edit</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">Account Type</p>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-white">Fan Account</p>
                  <p className="text-[10px] text-[#555555]">Standard fan access · Purchase moments · Manage digital assets</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
