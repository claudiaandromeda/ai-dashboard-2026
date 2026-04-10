import { createServerClient as createServerSupabaseClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/* ─── Server client (for server components / route handlers) ─── */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createServerSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only).
            // This is fine — middleware will handle refreshing.
          }
        },
      },
    }
  );
}

/* ─── Convenience helpers ─── */
export async function getSession() {
  const client = await createServerClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return session;
}

export async function getUser() {
  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
