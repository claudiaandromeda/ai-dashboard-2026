"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/auth-client";
import { getUserRole } from "@/lib/supabase/get-user-role";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signedUp = searchParams.get("signed_up") === "true";
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Redirect based on role
    if (next) {
      router.push(next);
    } else if (data.user) {
      const role = await getUserRole(data.user.id);
      if (role === "platform_admin") {
        router.push("/staff/dashboard");
      } else if (role === "club_admin") {
        router.push("/club/dashboard");
      } else {
        router.push("/");
      }
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-8">
        <h1 className="mb-2 text-2xl font-bold tracking-wide text-white">
          LOG IN
        </h1>
        <p className="mb-6 text-sm text-[#888888]">
          Sign in to your EmotivX account
        </p>

        {signedUp && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Account created successfully. Please log in.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-3 text-sm text-white placeholder-[#555555] outline-none transition focus:border-[#8AE234]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-3 text-sm text-white placeholder-[#555555] outline-none transition focus:border-[#8AE234]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#8AE234] px-4 py-3 text-sm font-semibold text-[#080810] transition hover:bg-[#8AE234]/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#888888]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#8AE234] hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
