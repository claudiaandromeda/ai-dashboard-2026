"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/auth-client";

export default function SignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/login?signed_up=true");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-8">
        <h1 className="mb-2 text-2xl font-bold tracking-wide text-white">
          SIGN UP
        </h1>
        <p className="mb-6 text-sm text-[#888888]">
          Create your EmotivX account
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-3 text-sm text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/50"
            />
          </div>

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
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-3 text-sm text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/50"
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
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-3 text-sm text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#DA291C] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#DA291C]/90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#888888]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#DA291C] hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
