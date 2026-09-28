"use client";

import { useActionState } from "react";
import { acceptInvite, type ActionState } from "@/app/account/actions";

export default function AcceptInviteButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(acceptInvite, {});
  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="token" value={token} />
      {state.error && <p className="mb-2 text-sm text-brand-red">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "Joining…" : "Accept invitation"}
      </button>
    </form>
  );
}
