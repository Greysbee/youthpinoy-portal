"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [nextUrl, setNextUrl] = useState("/library");
  const [emailLocked, setEmailLocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const n = p.get("next");
    if (n) setNextUrl(n);
    const em = p.get("email");
    if (em) {
      setEmail(em);
      setEmailLocked(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(nextUrl);
    router.refresh();
  }

  async function handleMagicLink() {
    setError("");
    if (!email) {
      setError("Enter your email first, then request a magic link.");
      return;
    }
    setMagicLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    if (otpError) {
      setError(otpError.message);
      setMagicLoading(false);
      return;
    }
    setMagicSent(true);
    setMagicLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResetLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setResetLoading(false);
      return;
    }

    setResetSent(true);
    setResetLoading(false);
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {showForgot ? (
              <>
                <h1 className="text-2xl font-bold text-brand-dark text-center">Reset Password</h1>
                <p className="mt-1 text-center text-sm text-brand-muted">
                  Enter your email and we&apos;ll send you a reset link
                </p>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {resetSent ? (
                  <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-4 text-center">
                    <p className="text-sm text-emerald-700 font-medium">Reset link sent!</p>
                    <p className="mt-1 text-xs text-emerald-600">Check your email for the password reset link.</p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="mt-8 space-y-5">
                    <div>
                      <label htmlFor="resetEmail" className="block text-sm font-medium text-brand-dark">Email</label>
                      <input id="resetEmail" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                        placeholder="you@example.com" />
                    </div>
                    <button type="submit" disabled={resetLoading}
                      className="w-full min-h-11 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>
                )}

                <p className="mt-6 text-center text-sm text-brand-muted">
                  <button onClick={() => { setShowForgot(false); setError(""); setResetSent(false); }}
                    className="font-semibold text-brand-accent hover:underline">
                    ← Back to Login
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-brand-dark text-center">Welcome Back</h1>
                <p className="mt-1 text-center text-sm text-brand-muted">Log in to access your courses</p>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-dark">Email</label>
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      readOnly={emailLocked}
                      className={`mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none ${emailLocked ? "bg-gray-50 text-brand-muted" : ""}`}
                      placeholder="you@example.com" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-brand-dark">Password</label>
                      <button type="button" onClick={() => { setShowForgot(true); setResetEmail(email); setError(""); }}
                        className="text-xs font-medium text-brand-accent hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                      placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full min-h-11 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
                    {loading ? "Logging In..." : "Log In"}
                  </button>
                </form>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-brand-muted">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {magicSent ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                    <p className="text-sm font-medium text-emerald-700">Magic link sent!</p>
                    <p className="mt-1 text-xs text-emerald-600">
                      Check {email} for a link to log in. You can close this tab.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={magicLoading}
                    className="mt-4 w-full min-h-11 rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors disabled:opacity-50"
                  >
                    {magicLoading ? "Sending link..." : "Email me a magic link"}
                  </button>
                )}

                <p className="mt-6 text-center text-sm text-brand-muted">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-semibold text-brand-accent hover:underline">Register</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
