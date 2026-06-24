"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(`Demo: Would register ${name} (${email}). Supabase auth not wired yet.`);
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-brand-dark text-center">Create Your Account</h1>
            <p className="mt-1 text-center text-sm text-brand-muted">
              Join YouthPinoy and start learning
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-brand-dark">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                  placeholder="Juan dela Cruz"
                />
              </div>
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-11 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
              >
                Create Account
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-brand-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-accent hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
