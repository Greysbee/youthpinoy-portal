"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(`Demo: Would log in as ${email}. Supabase auth not wired yet.`);
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-brand-dark text-center">Welcome Back</h1>
            <p className="mt-1 text-center text-sm text-brand-muted">
              Log in to access your courses
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-dark">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-brand-dark">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-11 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
              >
                Log In
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-brand-muted">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-brand-accent hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
