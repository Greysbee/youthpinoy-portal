"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";
import PasswordRules from "@/components/password-field";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { validatePassword } from "@/lib/password-validation";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  const pwError = password.length > 0 ? validatePassword(password) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password);
    if (validation) { setError(validation); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    router.push(nextUrl);
    router.refresh();
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-brand-dark text-center">Create Your Account</h1>
            <p className="mt-1 text-center text-sm text-brand-muted">Join YouthPinoy and start learning</p>

            {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-brand-dark">Full Name</label>
                <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                  placeholder="Juan dela Cruz" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-dark">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  readOnly={emailLocked}
                  className={`mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none ${emailLocked ? "bg-gray-50 text-brand-muted" : ""}`}
                  placeholder="you@example.com" />
                {emailLocked && <p className="mt-1 text-xs text-brand-muted">Use this email to claim your invitation.</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-brand-dark">Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm outline-none ${
                    pwError ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400" : "border-gray-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                  }`}
                  placeholder="••••••••" />
                <PasswordRules password={password} />
              </div>
              <button type="submit" disabled={loading || !!pwError}
                className="w-full min-h-11 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors disabled:opacity-50">
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-brand-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-accent hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
