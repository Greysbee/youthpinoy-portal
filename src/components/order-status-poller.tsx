"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OrderStatusPoller({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>("pending");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const MAX = 40; // ~100s at 2.5s
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (active && json.status) setStatus(json.status);
          if (json.status === "paid" || json.status === "failed" || json.status === "expired") {
            return; // stop polling
          }
        }
      } catch {
        /* keep polling */
      }
      if (active) setTries((t) => t + 1);
    };
    if (status === "pending" && tries < MAX) {
      const id = setTimeout(tick, tries === 0 ? 500 : 2500);
      return () => {
        active = false;
        clearTimeout(id);
      };
    }
  }, [orderId, tries, status]);

  if (status === "paid") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-brand-dark">Payment confirmed!</h1>
        <p className="mt-1 text-brand-muted">Your access is now active.</p>
        <Link href="/library" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Go to Library
        </Link>
      </div>
    );
  }

  if (status === "failed" || status === "expired") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Payment not completed</h1>
        <p className="mt-1 text-brand-muted">Your order was {status}. You can try again.</p>
        <Link href="/events" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Back to Events
        </Link>
      </div>
    );
  }

  const timedOut = tries >= 40;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
      {!timedOut ? (
        <>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-blue" />
          <h1 className="mt-4 text-xl font-bold text-brand-dark">Confirming your payment…</h1>
          <p className="mt-1 text-sm text-brand-muted">
            This updates automatically once PayMongo confirms. Don&apos;t close this tab.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-brand-dark">Still processing</h1>
          <p className="mt-1 text-sm text-brand-muted">
            This is taking longer than usual. Your access will appear in the Library once
            the payment is confirmed.
          </p>
          <Link href="/library" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Go to Library
          </Link>
        </>
      )}
    </div>
  );
}
