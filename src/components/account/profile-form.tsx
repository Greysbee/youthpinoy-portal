"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ActionState } from "@/app/account/actions";
import { useMemo } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, dialFor, TITLES } from "@/lib/reference";

export type DioceseOption = { name: string; province: string | null };

export type ProfileValues = {
  email: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobile: string;
  country: string;
  diocese: string;
  organization: string;
  dioceses: DioceseOption[];
};

export default function ProfileForm(props: ProfileValues) {
  // Group dioceses by ecclesiastical province for the dropdown, preserving order.
  const dioceseGroups = useMemo(() => {
    const groups: { province: string; names: string[] }[] = [];
    for (const d of props.dioceses) {
      const prov = d.province || "Other";
      let g = groups.find((x) => x.province === prov);
      if (!g) {
        g = { province: prov, names: [] };
        groups.push(g);
      }
      g.names.push(d.name);
    }
    return groups;
  }, [props.dioceses]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  const [mobile, setMobile] = useState(props.mobile ?? "");
  const [country, setCountry] = useState(props.country || DEFAULT_COUNTRY);

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
        <input value={props.email} disabled className={`${input} bg-gray-50 text-brand-muted`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className={label}>Title</label>
          <select name="title" defaultValue={props.title} className={input}>
            <option value="">—</option>
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>First name</label>
          <input name="first_name" defaultValue={props.firstName} className={input} />
        </div>
        <div>
          <label className={label}>Middle name</label>
          <input name="middle_name" defaultValue={props.middleName} className={input} />
        </div>
        <div>
          <label className={label}>Last name</label>
          <input name="last_name" defaultValue={props.lastName} className={input} />
        </div>
      </div>

      <div>
        <label className={label}>Mobile number</label>
        <div className="mt-1 flex gap-2">
          <select
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-40 rounded-lg border border-gray-300 px-2 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.dial}
              </option>
            ))}
          </select>
          <div className="flex flex-1 items-center rounded-lg border border-gray-300 px-3 shadow-sm focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent">
            <span className="mr-1 text-sm text-brand-muted">{dialFor(country)}</span>
            <input
              name="mobile"
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="9XXXXXXXXX"
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-brand-muted">Numbers only.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Diocese</label>
          <select name="diocese" defaultValue={props.diocese} className={input}>
            <option value="">— Select diocese —</option>
            {dioceseGroups.map((g) => (
              <optgroup key={g.province} label={g.province}>
                {g.names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Organization</label>
          <input name="organization" defaultValue={props.organization} className={input} />
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
