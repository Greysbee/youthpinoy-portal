// TODO Phase 2: Replace this stub with PayMongo Checkout Session API.
// Create session server-side, redirect user to PayMongo-hosted checkout URL,
// confirm payment via webhook (checkout_session.payment.paid event)
// instead of the button click below.

"use client";

import Navbar from "@/components/navbar";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<{ id: string; title: string; price: number; type: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("courses")
      .select("id, title, price, type")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setCourse(data);
        setLoading(false);
      });
  }, [id]);

  async function handleEnroll() {
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const status = course && course.price === 0 ? "free" : "pending";

    const { error: enrollError } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: id, status });

    if (enrollError) {
      if (enrollError.code === "23505") {
        setError("You are already enrolled in this course.");
      } else {
        setError(enrollError.message);
      }
      return;
    }

    setSubmitted(true);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-brand-muted">Loading...</p>
        </main>
      </>
    );
  }

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
            <h1 className="mt-4 text-2xl font-bold text-brand-dark">
              {course.price === 0 ? "You're In!" : "Enrollment Request Received!"}
            </h1>
            <p className="mt-2 text-brand-muted">
              {course.price === 0
                ? "You now have full access to this course."
                : "Your enrollment request has been received. Our team will confirm your payment and activate your access shortly."}
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
                {course.price === 0 ? "Free" : `₱${Number(course.price).toLocaleString()}`}
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {course.price > 0 && (
              <>
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
              </>
            )}

            <button
              onClick={handleEnroll}
              className="mt-6 w-full min-h-11 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
            >
              {course.price === 0 ? "Enroll for Free" : "Complete Enrollment"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
