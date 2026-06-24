"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-brand-blue text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-brand-gold">Youth</span>Pinoy
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/" className="hover:text-brand-gold transition-colors">
            Courses
          </Link>
          <Link href="/dashboard" className="hover:text-brand-gold transition-colors">
            My Learning
          </Link>
          <Link href="/admin" className="hover:text-brand-gold transition-colors">
            Admin
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-gold px-4 py-2 font-semibold text-brand-dark hover:bg-amber-400 transition-colors"
          >
            Register
          </Link>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-2">
            <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 hover:bg-white/10">
              Courses
            </Link>
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 hover:bg-white/10">
              My Learning
            </Link>
            <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 hover:bg-white/10">
              Admin
            </Link>
            <hr className="border-white/10" />
            <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 hover:bg-white/10">
              Log In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-brand-gold px-3 py-3 text-center font-semibold text-brand-dark"
            >
              Register
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
