"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerFree, startCheckout, type RegState } from "@/app/events/actions";

type RegField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export type EventForReg = {
  id: string;
  slug: string;
  price_centavos: number;
  registration_fields: RegField[];
  capacity: number | null;
};

export default function RegistrationForm({
  event,
  isLoggedIn,
  alreadyRegistered,
}: {
  event: EventForReg;
  isLoggedIn: boolean;
  alreadyRegistered: boolean;
}) {
  const isPaid = event.price_centavos > 0;
  const action = isPaid ? startCheckout : registerFree;
  const [state, formAction, pending] = useActionState<RegState, FormData>(action, {});
  const [qty, setQty] = useState(1);

  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

  if (alreadyRegistered) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="font-semibold text-emerald-800">You&apos;re registered for this event.</p>
        <Link href="/library" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Go to Library
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-brand-dark">Log in to register for this event.</p>
        <Link
          href={`/login?next=/events/${event.slug}`}
          className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  const total = (event.price_centavos * qty) / 100;

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="slug" value={event.slug} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {(event.registration_fields ?? []).map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-brand-dark">
            {f.label}
            {f.required && <span className="text-brand-red"> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea name={`answer_${f.key}`} required={f.required} rows={2} className={input} />
          ) : f.type === "select" ? (
            <select name={`answer_${f.key}`} required={f.required} className={input}>
              <option value="">— Select —</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <input type="checkbox" name={`answer_${f.key}`} value="yes" className="mt-2 h-4 w-4" />
          ) : (
            <input
              type={f.type === "email" ? "email" : f.type === "number" ? "number" : f.type === "phone" ? "tel" : "text"}
              name={`answer_${f.key}`}
              required={f.required}
              className={input}
            />
          )}
        </div>
      ))}

      {isPaid && (
        <div>
          <label className="block text-sm font-medium text-brand-dark">Quantity (seats)</label>
          <input
            name="quantity"
            type="number"
            min={1}
            max={event.capacity ?? 50}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
            className={`${input} max-w-[120px]`}
          />
          {qty > 1 && (
            <p className="mt-1 text-xs text-brand-muted">
              Buying {qty} seats creates a group you can invite people to.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 disabled:opacity-50"
      >
        {pending
          ? "Please wait…"
          : isPaid
            ? `Proceed to payment — ₱${total.toLocaleString()}`
            : "Register for free"}
      </button>
      {isPaid && (
        <p className="text-center text-xs text-brand-muted">Secure checkout via PayMongo (test mode).</p>
      )}
    </form>
  );
}
