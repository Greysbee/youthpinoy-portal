"use client";

import { useActionState, useState } from "react";
import { resumeOrderPayment, sendOrderPaymentLink, type PayLinkState } from "@/app/admin/orders/actions";

export default function OrderPaymentLink({ orderId }: { orderId: string }) {
  const [linkState, getLink, gettingLink] = useActionState<PayLinkState, FormData>(resumeOrderPayment, {});
  const [sendState, sendLink, sending] = useActionState<PayLinkState, FormData>(sendOrderPaymentLink, {});
  const [copied, setCopied] = useState(false);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={getLink}>
          <input type="hidden" name="order_id" value={orderId} />
          <button
            type="submit"
            disabled={gettingLink}
            className="rounded-lg border border-brand-blue px-2.5 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
          >
            {gettingLink ? "…" : "Payment link"}
          </button>
        </form>
        <form action={sendLink}>
          <input type="hidden" name="order_id" value={orderId} />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send to buyer"}
          </button>
        </form>
      </div>

      {linkState.url && (
        <div className="flex items-center gap-2">
          <a href={linkState.url} target="_blank" rel="noopener noreferrer" className="max-w-[220px] truncate text-xs text-brand-accent hover:underline">
            {linkState.url}
          </a>
          <button type="button" onClick={() => copy(linkState.url!)} className="text-xs text-brand-accent hover:underline">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {linkState.error && <p className="text-xs text-brand-red">{linkState.error}</p>}
      {sendState.ok && <p className="text-xs text-emerald-700">Sent to buyer.</p>}
      {sendState.error && <p className="text-xs text-brand-red">{sendState.error}</p>}
    </div>
  );
}
