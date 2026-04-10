"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const EXPLORE_LINKS = [
  { label: "Browse Moments", href: "/moments" },
  { label: "Euro 2024", href: "/competitions/euro-2024" },
  { label: "Wrexham 360°", href: "/teams/wrexham" },
  { label: "Teams", href: "/teams" },
  { label: "Art Styles", href: "/art-styles" },
];

const COMPANY_LINKS = [
  { label: "About EmotivX", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "For Clubs", href: "/clubs" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

const SUPPORT_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Shipping & Returns", href: "/shipping" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const SOCIALS = [
  { label: "X", href: "#" },
  { label: "Ig", href: "#" },
  { label: "Tk", href: "#" },
  { label: "Dc", href: "#" },
];

/* ------------------------------------------------------------------ */
/*  Link column                                                        */
/* ------------------------------------------------------------------ */

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-white">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-[#9CA3AF] transition hover:text-[#8AE234]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

export default function Footer() {
  const [email, setEmail] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail("");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  return (
    <footer className="border-t border-white/5 bg-[#080810]">
      {/* ---- Top Section: 4 columns ---- */}
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand */}
          <div className="space-y-4">
            <Link href="/" className="hover:opacity-80 transition">
              <Image src="/images/emotivx-logo.png" alt="EmotivX" width={240} height={80} className="h-20 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-[#9CA3AF]">
              Turn real sports moments into premium merch
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2.5 pt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-[#9CA3AF] transition hover:border-[#8AE234]/40 hover:text-[#8AE234]"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Explore */}
          <LinkColumn title="Explore" links={EXPLORE_LINKS} />

          {/* Column 3 — Company */}
          <LinkColumn title="Company" links={COMPANY_LINKS} />

          {/* Column 4 — Support */}
          <LinkColumn title="Support" links={SUPPORT_LINKS} />
        </div>
      </div>

      {/* ---- Newsletter Bar ---- */}
      <div className="border-y border-white/5 bg-[#111111]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
          <h3 className="text-sm font-bold tracking-wide text-white">
            Stay in the game
          </h3>
          <form
            onSubmit={handleSubscribe}
            className="flex w-full max-w-sm items-center gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-2.5 text-sm text-white placeholder-[#888888] outline-none focus:border-[#8AE234]/40"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[#8AE234] px-5 py-2.5 text-sm font-semibold text-[#080810] transition hover:bg-[#8AE234]/90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* ---- Bottom Bar ---- */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col items-center gap-3 text-[11px] text-[#9CA3AF] sm:flex-row sm:justify-between">
          <p>&copy; 2024 EmotivX. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>
              Powered by{" "}
              <a
                href="https://github.com/statsbomb/open-data"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9CA3AF] underline decoration-white/20 transition hover:text-[#8AE234]"
              >
                StatsBomb Open Data
              </a>
            </span>
            <span className="text-white/20">|</span>
            <span>Printed by Printful</span>
          </div>
        </div>
      </div>

      {/* ---- Toast ---- */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-white/10 bg-[#1F1F1F] px-5 py-3 text-sm text-white shadow-xl">
          Subscribed! We&apos;ll keep you posted.
        </div>
      )}
    </footer>
  );
}
