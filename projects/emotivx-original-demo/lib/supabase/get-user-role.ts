import { createBrowserClient } from "@/lib/supabase/auth-client";

export type UserRole = "platform_admin" | "club_admin" | "fan";

/**
 * Query admin_users table for this userId.
 * Returns "platform_admin", "club_admin" (mapped from team_admin), or "fan" if not found.
 * Uses the anon client — RLS policy allows users to read their own row.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) return "fan";
  if (data.role === "platform_admin") return "platform_admin";
  if (data.role === "team_admin") return "club_admin";
  return "fan";
}

/**
 * Server-side variant: pass a supabase client explicitly
 * (works in middleware where we can't use cookies() or createBrowserClient).
 */
export async function getUserRoleWithClient(
  supabase: { from: (table: string) => any },
  userId: string
): Promise<UserRole> {
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) return "fan";
  if (data.role === "platform_admin") return "platform_admin";
  if (data.role === "team_admin") return "club_admin";
  return "fan";
}
