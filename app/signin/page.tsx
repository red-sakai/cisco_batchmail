"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInAction } from "@/app/actions/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await signInAction(email, password);
      if (!res.ok) {
        setError(res.error || "Sign in failed.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center overflow-hidden p-4">
      <div className="planet" aria-hidden="true" />
      <div className="orbit" aria-hidden="true" />
      <div className="card signin-card w-full max-w-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <Image
            src="/cncp-white.png"
            alt="CNCP"
            width={83}
            height={64}
            className="logo-chip h-16 w-auto"
            priority
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">BatchMail</h1>
            <p className="text-xs text-muted">Cisco NetConnect PUP · Manila</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cncp.org"
              className="input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input mt-1 w-full"
            />
          </label>

          {error && (
            <div role="alert" className="notice notice-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary w-full ${loading ? "cursor-wait" : ""}`}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-subtle">
          Authorized CNCP members only. Sessions last 7 days.
        </p>
      </div>
    </main>
  );
}
