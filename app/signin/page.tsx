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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="tabs-shell w-full max-w-sm rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <Image
            src="/cisco-logo.jpg"
            alt="Cisco"
            width={96}
            height={32}
            className="h-10 w-auto rounded-sm border border-gray-200 bg-white p-1"
            priority
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              BatchMail
            </h1>
            <p className="text-xs text-gray-600">
              Cisco NetConnect PUP · Manila
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cncp.org"
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
              loading
                ? "bg-[#049fd9]/60 cursor-wait"
                : "bg-[#049fd9] hover:bg-[#0071a4]"
            }`}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-gray-500">
          Authorized CNCP members only. Sessions last 7 days.
        </p>
      </div>
    </main>
  );
}
