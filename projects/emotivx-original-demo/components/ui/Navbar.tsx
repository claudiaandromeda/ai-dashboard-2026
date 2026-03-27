"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  User,
  ChevronDown,
  LogOut,
  Heart,
  Package,
  Shield,
  Building2,
  Search,
} from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";

/* ------------------------------------------------------------------ */
/*  Nav link config                                                    */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/merch-preview", label: "Shop" },
  { href: "/staff/dashboard", label: "Staff" },
  { href: "/admin", label: "Admin" },
  { href: "/account", label: "My Account" },
  { href: "/your-moment", label: "Your Moment" },
] as const;

// Presentation deck URL — update this before the meeting
const PRESENTATION_URL = "/admin/deck";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, role, loading, signOut } = useAuth();
  const { itemCount } = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Account";

  // Close user menu on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Presentation Banner ── */}
      <div className="w-full bg-[#DA291C] px-4 py-1.5 text-center text-xs font-semibold text-white flex items-center justify-center gap-3">
        <span className="opacity-80">📊 INVESTOR DEMO — EmotivX Platform</span>
        <a
          href={PRESENTATION_URL}
          
          
          className="rounded bg-white/20 px-2.5 py-0.5 text-white hover:bg-white/30 transition font-bold tracking-wide"
        >
          Open Deck →
        </a>
        <span className="opacity-60 hidden sm:inline">|</span>
        <Link href="/assets-preview" className="hidden sm:inline opacity-80 hover:opacity-100 transition underline underline-offset-2">Assets In Progress</Link>
      </div>
      <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* ---- Left: Logo + Nav Links ---- */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 font-display text-lg font-extrabold tracking-[0.2em] text-white uppercase transition hover:opacity-80"
            >
              EMOTIV<span className="text-[#DA291C]">X</span>
              <span className="text-[#DA291C]">.</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    isActive(link.href)
                      ? "text-white"
                      : "text-[#888888] hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#DA291C]" />
                  )}
                </Link>
              ))}

              {/* Staff link — platform_admin only */}
              {role === "platform_admin" && (
                <Link
                  href="/staff/dashboard"
                  className={`relative flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    isActive("/staff") ? "text-white" : "text-[#888888] hover:text-white"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  Staff
                  {isActive("/staff") && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#DA291C]" />
                  )}
                </Link>
              )}

              {(role === "club_admin" || role === "platform_admin") && (
                <Link
                  href="/club/dashboard"
                  className={`relative flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    isActive("/club") ? "text-white" : "text-[#888888] hover:text-white"
                  }`}
                >
                  <Building2 className="h-3 w-3" />
                  Club
                  {isActive("/club") && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#DA291C]" />
                  )}
                </Link>
              )}
            </div>
          </div>

          {/* ---- Right: Search + Cart + User + Mobile toggle ---- */}
          <div className="flex items-center gap-2">
            {/* Search (desktop) */}
            <GlobalSearch />

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#888888] transition hover:bg-white/5 hover:text-white"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DA291C] px-1 text-[9px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>

            {/* User menu (desktop) */}
            {!loading && (
              <div ref={userMenuRef} className="relative hidden lg:block">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-1.5 transition hover:bg-white/5"
                    >
                      <User className="h-4 w-4 text-[#888888]" />
                      <span className="max-w-[120px] truncate text-xs text-white">
                        {displayName}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-[#888888] transition-transform ${
                          userMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] py-1 shadow-2xl">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/80 transition hover:bg-white/5 hover:text-white"
                        >
                          <User className="h-3.5 w-3.5" />
                          Profile
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/80 transition hover:bg-white/5 hover:text-white"
                        >
                          <Package className="h-3.5 w-3.5" />
                          My Orders
                        </Link>
                        <Link
                          href="/favourites"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/80 transition hover:bg-white/5 hover:text-white"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Favourites
                        </Link>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-[#DA291C] transition hover:bg-white/5"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Logout
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/login"
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/5"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded-lg bg-[#DA291C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#DA291C]/90"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#888888] transition hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ---- Mobile slide-in menu ---- */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-xs flex-col bg-[#0A0A0A] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="font-display text-sm font-extrabold tracking-[0.2em] text-white uppercase">
            EMOTIV<span className="text-[#DA291C]">X</span>
            <span className="text-[#DA291C]">.</span>
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] transition hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile search */}
        <div className="border-b border-white/10 px-5 py-3">
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 text-xs text-[#888888] transition hover:border-[#DA291C]/40"
          >
            <Search className="h-3.5 w-3.5" />
            Search teams, players...
          </Link>
        </div>

        {/* Mobile nav links */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-white/5 text-white"
                    : "text-[#888888] hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive(link.href) && (
                  <span className="mr-2 h-5 w-0.5 rounded-full bg-[#DA291C]" />
                )}
                {link.label}
              </Link>
            ))}

            <div className="my-3 border-t border-white/10" />

            {/* Staff + Club */}
            <Link
              href="/staff/dashboard"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive("/staff")
                  ? "bg-white/5 text-white"
                  : "text-[#888888] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Staff Dashboard
            </Link>
            <Link
              href="/club/dashboard"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive("/club")
                  ? "bg-white/5 text-white"
                  : "text-[#888888] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Club Portal
            </Link>
          </div>
        </div>

        {/* Mobile footer — user + cart */}
        <div className="border-t border-white/10 px-5 py-4 space-y-2">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2.5 rounded-lg bg-[#1F1F1F] px-3 py-2.5">
                <User className="h-4 w-4 text-[#888888]" />
                <span className="truncate text-xs text-white">
                  {displayName}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-white/70 transition hover:bg-white/5"
                >
                  Profile
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-white/70 transition hover:bg-white/5"
                >
                  Orders
                </Link>
                <Link
                  href="/favourites"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-white/70 transition hover:bg-white/5"
                >
                  Favs
                </Link>
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="w-full rounded-lg border border-[#DA291C]/30 px-3 py-2 text-xs text-[#DA291C] transition hover:bg-[#DA291C]/10"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-center text-xs text-white/70 transition hover:bg-white/5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg bg-[#DA291C] px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-[#DA291C]/90"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Cart shortcut */}
          <button
            onClick={() => {
              setMobileOpen(false);
              setCartOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F1F1F] px-3 py-2.5 text-xs text-white transition hover:bg-white/5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Cart
            {itemCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DA291C] px-1 text-[9px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ---- Cart Drawer ---- */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
