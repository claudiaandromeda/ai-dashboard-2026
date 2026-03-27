"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/auth-client";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  favourite_team_id: string | null;
  role: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  role: "platform_admin" | "club_admin" | "fan";
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "fan",
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"platform_admin" | "club_admin" | "fan">("fan");
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  }

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) { setRole("fan"); return; }
    if (data.role === "platform_admin") setRole("platform_admin");
    else if (data.role === "team_admin") setRole("club_admin");
    else setRole("fan");
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
      } else {
        setProfile(null);
        setRole("fan");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
