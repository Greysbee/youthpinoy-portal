"use client";

import Navbar from "@/components/navbar";
import PasswordRules from "@/components/password-field";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { validatePassword } from "@/lib/password-validation";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  const pwError = password.length > 0 ? validatePassword(password) : null;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validatePassword(password);
    if (validation) { setError(validation); return; }

    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) { setError(updateError.message); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 2000);
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-brand-dark text-center">Set New Password</h1>

            {success ? (
              <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-4 text-center">
                <p className="text-sm text-emerald-700 font-medium">Password updated!</p>
                <p className="mt-1 text-xs text-emerald-600">Redirecting to your dashboard...</p>
              </div>
            ) : !ready ? (
              <p className="mt-6 text-center text-sm text-brand-muted">Loading...</p>
            ) : (
              <>
                {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-brand-dark">New Password</label>
                    <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                      placeholder="••••••••" />
                    <PasswordRules password={password} />
                  </div>
                  <button type="submit" disabled={loading || !!pwError}
                    className="w-full min-h-11 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
