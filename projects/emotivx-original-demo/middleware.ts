import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── DEMO MODE: bypass auth for all routes ──────────────────────────
  // Remove this block before production
  return NextResponse.next();
  // ───────────────────────────────────────────────────────────────────

  const isStaffRoute = pathname.startsWith("/staff") || pathname.startsWith("/admin");
  const isClubRoute = pathname.startsWith("/club");

  // Only protect /staff/*, /admin/*, and /club/* routes
  if (!isStaffRoute && !isClubRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session (important for SSR)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin_users table for role
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const role = adminRow?.role ?? null;

  // /staff/* and /admin/* → requires platform_admin
  if (isStaffRoute && role !== "platform_admin") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // /club/* → requires team_admin or platform_admin
  if (isClubRoute && role !== "platform_admin" && role !== "team_admin") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/club/:path*"],
};
