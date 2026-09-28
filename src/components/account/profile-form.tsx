"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/account/actions";

export default function ProfileForm({
  fullName,
  phone,
  organization,
  email,
}: {
  fullName: string;
  phone: string;
  organization: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";
  const label = "block text-sm font-medium text-brand-dark";

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}
      {state.notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{state.notice}</div>
      )}
      <div>
        <label className={label}>Email</label>
        <input value={email} disabled className={`${input} bg-gray-50 text-brand-muted`} />
      </div>
      <div>
        <label className={label}>Full name</label>
        <input name="full_name" defaultValue={fullName} className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Phone</label>
          <input name="phone" defaultValue={phone} className={input} />
        </div>
        <div>
          <label className={label}>Organization</label>
          <input name="organization" defaultValue={organization} className={input} />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
