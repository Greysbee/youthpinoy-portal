// TODO Phase 2: Replace this stub with PayMongo Checkout Session API.
// Create session server-side, redirect user to PayMongo-hosted checkout URL,
// confirm payment via webhook (checkout_session.payment.paid event)
// instead of the button click below.

"use client";

import Navbar from "@/components/navbar";
import Link from "next/link";
import { mockCourses } from "@/lib/mock-data";
import { useState, use } from "react";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = mockCourses.find((c) => c.id === id);
  const [submitted, setSubmitted] = useState(false);

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-brand-muted">Course not found.</p>
        </main>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-brand-dark">Enrollment Request Received!</h1>
            <p className="mt-2 text-brand-muted">
              Your enrollment request has been received. Our team will confirm your payment and activate your access shortly.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Go to My Dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-6">
            ← Back to course
          </Link>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-brand-dark">Order Summary</h1>

            <div className="mt-4 flex items-start justify-between gap-4 rounded-lg bg-brand-light p-4">
              <div>
                <p className="font-medium text-brand-dark">{course.title}</p>
                <p className="text-sm text-brand-muted">Full course access</p>
              </div>
              <p className="text-lg font-bold text-brand-dark whitespace-nowrap">
                {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="font-semibold text-amber-800">Payment Instructions</h2>
              <div className="mt-2 space-y-1 text-sm text-amber-700">
                <p><strong>GCash:</strong> 0917-XXX-XXXX (YouthPinoy)</p>
                <p><strong>BPI:</strong> 1234-5678-90 (YouthPinoy Inc.)</p>
                <p className="mt-2">
                  Send your payment, then click &quot;Complete Enrollment&quot; below. Our team will verify your payment and activate your access within 24 hours.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSubmitted(true)}
              className="mt-6 w-full min-h-11 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
            >
              Complete Enrollment
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
