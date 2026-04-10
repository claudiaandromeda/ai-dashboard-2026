/**
 * WebGL capability detection utilities.
 * Call these BEFORE attempting to load Three.js.
 */

export type WebGLTier = "full" | "limited" | "none";

/** Try to create an actual WebGL context — catches broken/blacklisted GPUs */
function canCreateWebGLContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!ctx) return false;
    // Check it's not a lost context immediately
    const gl = ctx as WebGLRenderingContext;
    return !gl.isContextLost();
  } catch {
    return false;
  }
}

/** Rough device memory check (not available everywhere, fails gracefully) */
function hasEnoughMemory(minGB = 2): boolean {
  const mem = (navigator as any).deviceMemory;
  if (mem === undefined) return true; // assume fine if API not available
  return mem >= minGB;
}

/** Rough CPU core check */
function hasEnoughCores(min = 2): boolean {
  const cores = navigator.hardwareConcurrency;
  if (!cores) return true;
  return cores >= min;
}

/**
 * Returns:
 * - "full"    → run 3D viewer at full quality
 * - "limited" → run 3D viewer with reduced quality (cap DPR, no shadows)
 * - "none"    → skip 3D entirely, show flat fallback
 */
export function getWebGLTier(): WebGLTier {
  if (typeof window === "undefined") return "none"; // SSR

  // Hard fail: no WebGL at all
  if (!window.WebGLRenderingContext) return "none";
  if (!canCreateWebGLContext()) return "none";

  // Very low-end device signals → flat fallback
  if (!hasEnoughMemory(1)) return "none";   // < 1GB RAM
  if (!hasEnoughCores(2)) return "limited"; // 1-2 cores → reduced quality

  // Limited tier: < 2GB RAM or < 4 cores
  if (!hasEnoughMemory(2) || !hasEnoughCores(4)) return "limited";

  return "full";
}

/** Cached result so we only probe once per page load */
let _cached: WebGLTier | null = null;
export function getWebGLTierCached(): WebGLTier {
  if (_cached === null) _cached = getWebGLTier();
  return _cached;
}
