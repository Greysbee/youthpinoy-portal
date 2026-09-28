"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveEvent, type EventFormState } from "@/app/admin/events/actions";

type RegField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export type EventInput = {
  id?: string;
  code?: string;
  title?: string;
  slug?: string;
  description?: string | null;
  status?: string;
  price_centavos?: number;
  capacity?: number | null;
  venue?: string | null;
  is_online?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  cover_image_url?: string | null;
  registration_fields?: RegField[];
  includedEventIds?: string[];
};

const FIELD_TYPES = ["text", "textarea", "email", "phone", "number", "select", "checkbox"];

function toLocalInput(value?: string | null): string {
  if (!value) return "";
  // Accept ISO / timestamptz and produce a datetime-local value.
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({
  event,
  allEvents,
}: {
  event?: EventInput;
  allEvents: { id: string; code: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    saveEvent,
    {}
  );
  const [fields, setFields] = useState<RegField[]>(event?.registration_fields ?? []);

  function updateField(i: number, patch: Partial<RegField>) {
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addField() {
    setFields((f) => [...f, { key: "", label: "", type: "text", required: false }]);
  }
  function removeField(i: number) {
    setFields((f) => f.filter((_, idx) => idx !== i));
  }

  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";
  const label = "block text-sm font-medium text-brand-dark";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {event?.id && <input type="hidden" name="id" value={event.id} />}
      {/* Serialized registration-question builder */}
      <input
        type="hidden"
        name="registration_fields"
        value={JSON.stringify(
          fields
            .filter((f) => f.label.trim())
            .map((f) => ({
              key: f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
              label: f.label.trim(),
              type: f.type,
              required: f.required,
              ...(f.type === "select" && f.options?.length ? { options: f.options } : {}),
            }))
        )}
      />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Event code *</label>
          <input name="code" required defaultValue={event?.code} placeholder="CSMSv16" className={input} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={event?.status ?? "draft"} className={input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Title *</label>
        <input name="title" required defaultValue={event?.title} className={input} />
      </div>

      <div>
        <label className={label}>Slug</label>
        <input name="slug" defaultValue={event?.slug} placeholder="auto from title if blank" className={input} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={3} defaultValue={event?.description ?? ""} className={input} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Price (₱)</label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={event ? (event.price_centavos ?? 0) / 100 : 0}
            className={input}
          />
          <p className="mt-1 text-xs text-brand-muted">0 = free</p>
        </div>
        <div>
          <label className={label}>Capacity</label>
          <input name="capacity" type="number" min="0" defaultValue={event?.capacity ?? ""} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Starts</label>
          <input name="start_at" type="datetime-local" defaultValue={toLocalInput(event?.start_at)} className={input} />
        </div>
        <div>
          <label className={label}>Ends</label>
          <input name="end_at" type="datetime-local" defaultValue={toLocalInput(event?.end_at)} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Venue</label>
          <input name="venue" defaultValue={event?.venue ?? ""} className={input} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-brand-dark">
            <input type="checkbox" name="is_online" defaultChecked={event?.is_online ?? true} />
            Online event
          </label>
        </div>
      </div>

      <div>
        <label className={label}>Cover image URL</label>
        <input name="cover_image_url" defaultValue={event?.cover_image_url ?? ""} className={input} />
      </div>

      {/* Includes access to */}
      <div>
        <label className={label}>Includes access to</label>
        <p className="text-xs text-brand-muted">
          Buyers of this event also unlock the selected events (resolved transitively).
        </p>
        <div className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
          {allEvents
            .filter((e) => e.id !== event?.id)
            .map((e) => (
              <label key={e.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="includes"
                  value={e.id}
                  defaultChecked={event?.includedEventIds?.includes(e.id)}
                />
                <span className="font-medium">{e.code}</span>
                <span className="truncate text-brand-muted">{e.title}</span>
              </label>
            ))}
          {allEvents.length === 0 && (
            <p className="px-2 py-1 text-sm text-brand-muted">No other events yet.</p>
          )}
        </div>
      </div>

      {/* Registration question builder */}
      <div>
        <label className={label}>Registration questions</label>
        <div className="mt-2 space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  placeholder="Question label"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  className={input}
                />
                <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} className={input}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {f.type === "select" && (
                <input
                  placeholder="Options (comma separated)"
                  defaultValue={f.options?.join(", ") ?? ""}
                  onChange={(e) =>
                    updateField(i, {
                      options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`${input} mt-2`}
                />
              )}
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-brand-dark">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="text-sm text-brand-red hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-brand-muted hover:bg-gray-50"
        >
          + Add question
        </button>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save event"}
        </button>
        <Link href="/admin/events" className="text-sm text-brand-muted hover:text-brand-dark">
          Cancel
        </Link>
      </div>
    </form>
  );
}
