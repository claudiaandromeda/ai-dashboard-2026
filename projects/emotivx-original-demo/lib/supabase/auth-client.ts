import { createBrowserClient as createBrowserSupabaseClient } from "@supabase/ssr";
import { supabase } from "./client";

/* ─── Browser client (for client components) ─── */
export function createBrowserClient() {
  return createBrowserSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* ─── Auth actions (client-side) ─── */
export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
