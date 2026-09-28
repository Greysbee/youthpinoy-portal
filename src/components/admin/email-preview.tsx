"use client";

import { useActionState, useState } from "react";
import { sendTestEmail, type TestState } from "@/app/admin/emails/actions";

export type Preview = { type: string; label: string; subject: string; html: string };

export default function EmailPreview({ previews }: { previews: Preview[] }) {
  const [active, setActive] = useState(previews[0]?.type ?? "");
  const [state, formAction, pending] = useActionState<TestState, FormData>(sendTestEmail, {});
  const current = previews.find((p) => p.type === active) ?? previews[0];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {previews.map((p) => (
          <button
            key={p.type}
            onClick={() => setActive(p.type)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active === p.type ? "bg-brand-blue text-white" : "bg-gray-100 text-brand-dark hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted">Subject</p>
              <p className="font-semibold text-brand-dark">{current.subject}</p>
            </div>
            <form action={formAction}>
              <input type="hidden" name="type" value={current.type} />
              <button
                type="submit"
                disabled={pending}
                className="min-h-10 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-brand-dark hover:bg-amber-400 disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send test to me"}
              </button>
            </form>
          </div>

          {state.error && <p className="mt-2 text-sm text-brand-red">{state.error}</p>}
          {state.notice && <p className="mt-2 text-sm text-emerald-700">{state.notice}</p>}

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <iframe
              title="Email preview"
              srcDoc={current.html}
              className="h-[640px] w-full bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
