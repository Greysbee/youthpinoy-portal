"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { saveEvent, type EventFormState } from "@/app/admin/events/actions";
import { createClient } from "@/lib/supabase-client";

type RegField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export type TicketTypeForm = {
  id?: string;
  name: string;
  code: string;
  price: string; // pesos, as text
  capacity: string;
  includes: string[]; // event ids this type unlocks
};

export type EventInput = {
  id?: string;
  code?: string;
  title?: string;
  slug?: string;
  type?: string;
  description?: string | null;
  status?: string;
  price_centavos?: number;
  capacity?: number | null;
  venue?: string | null;
  venue_type?: string | null;
  is_online?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  cover_image_url?: string | null;
  registration_fields?: RegField[];
  includedEventIds?: string[];
  ticketTypes?: TicketTypeForm[];
};

const FIELD_TYPES = ["text", "textarea", "email", "phone", "number", "select", "checkbox"];

function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TT_INPUT =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

function TicketTypeCard({
  tt,
  index,
  allEvents,
  eventId,
  onChange,
  onRemove,
}: {
  tt: TicketTypeForm;
  index: number;
  allEvents: { id: string; code: string; title: string }[];
  eventId?: string;
  onChange: (patch: Partial<TicketTypeForm>) => void;
  onRemove: () => void;
}) {
  const [pick, setPick] = useState("");
  const codeById = (id: string) => allEvents.find((e) => e.id === id)?.code ?? id;
  const selectable = allEvents.filter((e) => e.id !== eventId && !tt.includes.includes(e.id));

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Ticket type {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-sm text-brand-red hover:underline">Remove</button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input placeholder="Ticket name (e.g. VIP)" value={tt.name} onChange={(e) => onChange({ name: e.target.value })} className={TT_INPUT} />
        <input placeholder="Ticket code (e.g. VIP)" value={tt.code} onChange={(e) => onChange({ code: e.target.value })} className={TT_INPUT} />
        <input type="number" min="0" step="0.01" placeholder="Price (₱)" value={tt.price} onChange={(e) => onChange({ price: e.target.value })} className={TT_INPUT} />
        <input type="number" min="0" placeholder="Capacity (optional)" value={tt.capacity} onChange={(e) => onChange({ capacity: e.target.value })} className={TT_INPUT} />
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-brand-dark">Inclusions (what this ticket unlocks)</p>
        <div className="mt-1 flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={TT_INPUT}>
            <option value="">— Select a course/event —</option>
            {selectable.map((e) => (
              <option key={e.id} value={e.id}>{e.code} · {e.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (pick && !tt.includes.includes(pick)) onChange({ includes: [...tt.includes, pick] });
              setPick("");
            }}
            className="min-h-11 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Add
          </button>
        </div>
        {tt.includes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tt.includes.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm">
                {codeById(id)}
                <button type="button" onClick={() => onChange({ includes: tt.includes.filter((i) => i !== id) })} className="text-brand-red hover:underline">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventForm({
  event,
  allEvents,
}: {
  event?: EventInput;
  allEvents: { id: string; code: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(saveEvent, {});
  const [fields, setFields] = useState<RegField[]>(event?.registration_fields ?? []);
  const [venueType, setVenueType] = useState(event?.venue_type ?? "online");
  const [coverUrl, setCoverUrl] = useState(event?.cover_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [includes, setIncludes] = useState<string[]>(event?.includedEventIds ?? []);
  const [pick, setPick] = useState("");

  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>(event?.ticketTypes ?? []);
  function updateTT(i: number, patch: Partial<TicketTypeForm>) {
    setTicketTypes((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addTT() {
    setTicketTypes((t) => [...t, { name: "", code: "", price: "", capacity: "", includes: [] }]);
  }
  function removeTT(i: number) {
    setTicketTypes((t) => t.filter((_, idx) => idx !== i));
  }

  const selectable = allEvents.filter((e) => e.id !== event?.id && !includes.includes(e.id));
  const codeById = (id: string) => allEvents.find((e) => e.id === id)?.code ?? id;

  function updateField(i: number, patch: Partial<RegField>) {
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addField() {
    setFields((f) => [...f, { key: "", label: "", type: "text", required: false }]);
  }
  function removeField(i: number) {
    setFields((f) => f.filter((_, idx) => idx !== i));
  }
  function moveField(i: number, dir: -1 | 1) {
    setFields((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.length) return f;
      const copy = [...f];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${event?.id ?? "new"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";
  const label = "block text-sm font-medium text-brand-dark";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {event?.id && <input type="hidden" name="id" value={event.id} />}
      {/* Type is implied by where it's created: Events -> event, Library -> course.
          Preserve the existing type when editing. */}
      <input type="hidden" name="type" value={event?.type ?? "event"} />
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
      {includes.map((id) => (
        <input key={id} type="hidden" name="includes" value={id} />
      ))}
      <input
        type="hidden"
        name="ticket_types"
        value={JSON.stringify(
          ticketTypes
            .filter((t) => t.name.trim() && t.code.trim())
            .map((t) => ({
              id: t.id,
              name: t.name.trim(),
              code: t.code.trim(),
              price_centavos: Math.round((parseFloat(t.price) || 0) * 100),
              capacity: t.capacity.trim() ? parseInt(t.capacity, 10) : null,
              includes: t.includes,
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
          <label className={label}>Code *</label>
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
          <input name="price" type="number" min="0" step="0.01" defaultValue={event ? (event.price_centavos ?? 0) / 100 : 0} className={input} />
          <p className="mt-1 text-xs text-brand-muted">0 = free. Ignored if you add ticket types below.</p>
        </div>
        <div>
          <label className={label}>Capacity</label>
          <input name="capacity" type="number" min="0" defaultValue={event?.capacity ?? ""} className={input} />
        </div>
      </div>

      {/* Venue */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Event type</label>
          <select name="venue_type" value={venueType} onChange={(e) => setVenueType(e.target.value)} className={input}>
            <option value="online">Online</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        {venueType !== "online" && (
          <div>
            <label className={label}>Venue</label>
            <input name="venue" defaultValue={event?.venue ?? ""} placeholder="e.g. SMX Convention Center" className={input} />
          </div>
        )}
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

      {/* Cover image with upload */}
      <div>
        <label className={label}>Cover image</label>
        <div className="mt-1 flex gap-2">
          <input
            name="cover_image_url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="Paste a URL or upload →"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload image"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm text-brand-dark hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? (
              "Uploading…"
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
              </svg>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
        </div>
        {uploadErr && <p className="mt-1 text-xs text-brand-red">{uploadErr}</p>}
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="cover preview" className="mt-2 h-24 w-auto rounded-lg border border-gray-200 object-cover" />
        )}
      </div>

      {/* Include access to — dropdown + add */}
      <div>
        <label className={label}>Includes access to</label>
        <p className="text-xs text-brand-muted">Enrollees also unlock the selected items (resolved transitively).</p>
        <div className="mt-2 flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
            <option value="">— Select a course/event —</option>
            {selectable.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} · {e.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (pick && !includes.includes(pick)) setIncludes((x) => [...x, pick]);
              setPick("");
            }}
            className="min-h-11 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Add
          </button>
        </div>
        {includes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {includes.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm">
                {codeById(id)}
                <button type="button" onClick={() => setIncludes((x) => x.filter((i) => i !== id))} className="text-brand-red hover:underline">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ticket types — each with its own price, capacity, and inclusions. When present,
          these replace the single price above for purchasing. */}
      <div>
        <label className={label}>Ticket types</label>
        <p className="text-xs text-brand-muted">
          Add one or more ticket types. Each has its own price, capacity, and inclusions. Buyers choose a type and
          quantity; every ticket gets a number (event code + 001, 002, …).
        </p>
        <div className="mt-2 space-y-3">
          {ticketTypes.map((tt, i) => (
            <TicketTypeCard
              key={i}
              tt={tt}
              index={i}
              allEvents={allEvents}
              eventId={event?.id}
              onChange={(patch) => updateTT(i, patch)}
              onRemove={() => removeTT(i)}
            />
          ))}
        </div>
        <button type="button" onClick={addTT} className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-brand-muted hover:bg-gray-50">
          + Add ticket type
        </button>
      </div>

      {/* Registration questions */}
      <div>
        <label className={label}>Registration questions</label>
        <p className="text-xs text-brand-muted">
          Title, first name, last name and email are always collected automatically. Add only <em>extra</em> questions here.
        </p>
        <div className="mt-2 space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input placeholder="Question label" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} className={input} />
                <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} className={input}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {f.type === "select" && (
                <input
                  placeholder="Options (comma separated)"
                  defaultValue={f.options?.join(", ") ?? ""}
                  onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className={`${input} mt-2`}
                />
              )}
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-brand-dark">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                  Required
                </label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0} title="Move up" className="rounded px-2 py-1 text-brand-muted hover:bg-gray-100 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} title="Move down" className="rounded px-2 py-1 text-brand-muted hover:bg-gray-100 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeField(i)} className="ml-1 text-sm text-brand-red hover:underline">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addField} className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-brand-muted hover:bg-gray-50">
          + Add question
        </button>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <Link href="/admin/events" className="text-sm text-brand-muted hover:text-brand-dark">Cancel</Link>
      </div>
    </form>
  );
}
