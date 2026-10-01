"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { startTicketCheckout, type RegState } from "@/app/events/actions";
import { TITLES } from "@/lib/reference";

type RegField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export type TicketTypeView = {
  id: string;
  name: string;
  code: string;
  priceCentavos: number;
  capacity: number | null;
  includes: string[]; // event codes
};

export type BuyerDefaults = {
  title: string;
  firstName: string;
  lastName: string;
  mobile: string;
};

const peso = (c: number) => (c === 0 ? "Free" : `₱${(c / 100).toLocaleString("en-PH")}`);

function TicketCard({
  tt,
  qty,
  onQty,
}: {
  tt: TicketTypeView;
  qty: number;
  onQty: (n: number) => void;
}) {
  const max = tt.capacity ?? 50;
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* ticket stub notches */}
      <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gray-100" />
      <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gray-100" />
      <div className="flex items-stretch">
        <div className="flex w-16 flex-col items-center justify-center border-r border-dashed border-gray-300 bg-brand-blue/5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Ticket</span>
          <svg className="mt-1 h-5 w-5 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v1a2 2 0 100 4v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1a2 2 0 100-4V6z" />
          </svg>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-bold text-brand-dark">{tt.name}</p>
            <p className="text-brand-gold font-bold">{peso(tt.priceCentavos)}</p>
            {tt.includes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="text-[11px] text-brand-muted">Unlocks:</span>
                {tt.includes.map((code) => (
                  <span key={code} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQty(Math.max(0, qty - 1))}
              className="h-8 w-8 rounded-lg border border-gray-300 text-lg font-bold text-brand-dark hover:bg-gray-50"
              aria-label="Decrease"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              max={max}
              value={qty}
              onChange={(e) => onQty(Math.min(max, Math.max(0, parseInt(e.target.value || "0", 10) || 0)))}
              className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-center text-sm outline-none focus:border-brand-accent"
            />
            <button
              type="button"
              onClick={() => onQty(Math.min(max, qty + 1))}
              className="h-8 w-8 rounded-lg border border-gray-300 text-lg font-bold text-brand-dark hover:bg-gray-50"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketPurchase({
  event,
  ticketTypes,
  isLoggedIn,
  buyer,
}: {
  event: { id: string; slug: string; registration_fields: RegField[] };
  ticketTypes: TicketTypeView[];
  isLoggedIn: boolean;
  buyer: BuyerDefaults;
}) {
  const [state, formAction, pending] = useActionState<RegState, FormData>(startTicketCheckout, {});
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [mobile, setMobile] = useState(buyer.mobile ?? "");

  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

  const items = useMemo(
    () => ticketTypes.map((t) => ({ id: t.id, qty: qtys[t.id] ?? 0 })).filter((x) => x.qty > 0),
    [ticketTypes, qtys]
  );
  const total = useMemo(
    () => items.reduce((s, it) => s + (ticketTypes.find((t) => t.id === it.id)?.priceCentavos ?? 0) * it.qty, 0),
    [items, ticketTypes]
  );
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="slug" value={event.slug} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — choose tickets */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Get tickets</h2>
          <div className="space-y-3">
            {ticketTypes.map((t) => (
              <TicketCard key={t.id} tt={t} qty={qtys[t.id] ?? 0} onQty={(n) => setQtys((q) => ({ ...q, [t.id]: n }))} />
            ))}
          </div>
        </div>

        {/* Right — registration details + total */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-dark">Registration details</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-brand-muted">Title</label>
            <select name="title" defaultValue={buyer.title} className={input}>
              <option value="">—</option>
              {TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-brand-muted">First name *</label>
            <input name="first_name" required defaultValue={buyer.firstName} className={input} />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-brand-muted">Last name *</label>
            <input name="last_name" required defaultValue={buyer.lastName} className={input} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-brand-muted">Mobile (optional)</label>
          <input
            name="mobile"
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            placeholder="9XXXXXXXXX"
            className={input}
          />
        </div>
      </div>

      {(event.registration_fields ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-brand-dark">A few questions</p>
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
        </div>
      )}

          <div className="rounded-xl border border-gray-200 bg-brand-blue/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-muted">
                {totalQty} ticket{totalQty !== 1 ? "s" : ""}
              </span>
              <span className="text-lg font-bold text-brand-dark">Total: ₱{(total / 100).toLocaleString("en-PH")}</span>
            </div>
            {isLoggedIn ? (
              <>
                <button
                  type="submit"
                  disabled={pending || totalQty === 0}
                  className="mt-3 min-h-11 w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 disabled:opacity-50"
                >
                  {pending ? "Please wait…" : total > 0 ? `Pay ₱${(total / 100).toLocaleString("en-PH")}` : "Get tickets"}
                </button>
                {total > 0 && <p className="mt-2 text-center text-xs text-brand-muted">Secure checkout via PayMongo (test mode).</p>}
              </>
            ) : (
              <Link
                href={`/login?next=/event/${event.slug}`}
                className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400"
              >
                Log in to get tickets
              </Link>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
