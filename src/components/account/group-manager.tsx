"use client";

import { useActionState, useState } from "react";
import {
  addGroupMember,
  renameGroup,
  removeGroupMember,
  resendInvite,
  type ActionState,
} from "@/app/account/actions";

export type GroupMemberView = {
  id: string;
  email: string;
  status: string;
  inviteUrl: string;
};
export type OwnedGroupView = {
  id: string;
  name: string;
  eventCode: string;
  seatsTotal: number;
  members: GroupMemberView[];
};

function AddMemberForm({ groupId, seatsLeft }: { groupId: string; seatsLeft: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addGroupMember, {});
  return (
    <form action={formAction} className="mt-3 border-t border-gray-100 pt-3">
      <input type="hidden" name="group_id" value={groupId} />
      {state.error && <p className="mb-2 text-sm text-brand-red">{state.error}</p>}
      {state.notice && <p className="mb-2 text-sm text-emerald-700">{state.notice}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="invitee@email.com"
          disabled={seatsLeft <= 0}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={pending || seatsLeft <= 0}
          className="min-h-10 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Inviting…" : "Invite"}
        </button>
      </div>
      {seatsLeft <= 0 && <p className="mt-1 text-xs text-brand-muted">All seats are used.</p>}
    </form>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="text-xs text-brand-accent hover:underline"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function GroupCard({ group }: { group: OwnedGroupView }) {
  const used = group.members.length; // non-removed invites/joins
  const seatsLeft = group.seatsTotal - 1 - used; // owner holds 1 seat
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form action={renameGroup} className="flex items-center gap-2">
          <input type="hidden" name="group_id" value={group.id} />
          <input
            name="name"
            defaultValue={group.name}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-semibold outline-none focus:border-brand-accent"
          />
          <button className="text-xs text-brand-accent hover:underline">Rename</button>
        </form>
        <span className="text-xs text-brand-muted">
          {group.eventCode} · {used + 1} of {group.seatsTotal} seats used
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        <li className="flex items-center justify-between text-sm">
          <span className="text-brand-muted">You (owner)</span>
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">owner</span>
        </li>
        {group.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{m.email}</span>
            <span className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  m.status === "joined" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {m.status}
              </span>
              {m.status === "invited" && <CopyLink url={m.inviteUrl} />}
              {m.status === "invited" && (
                <form action={resendInvite}>
                  <input type="hidden" name="member_id" value={m.id} />
                  <button className="text-xs text-brand-accent hover:underline">Resend</button>
                </form>
              )}
              <form action={removeGroupMember}>
                <input type="hidden" name="member_id" value={m.id} />
                <button className="text-xs text-brand-red hover:underline">Remove</button>
              </form>
            </span>
          </li>
        ))}
      </ul>

      <AddMemberForm groupId={group.id} seatsLeft={seatsLeft} />
    </div>
  );
}

export default function GroupManager({ groups }: { groups: OwnedGroupView[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-brand-muted">You don&apos;t own any group tickets yet.</p>;
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  );
}
