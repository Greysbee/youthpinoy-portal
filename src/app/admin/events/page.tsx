import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin, centavosToPesos } from "@/lib/admin";
import { deleteEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const { admin } = await requireAdmin();

  const { data: events } = await admin
    .from("events")
    .select("id, code, title, status, price_centavos, start_at")
    .order("start_at", { ascending: false });

  const { data: videos } = await admin.from("videos").select("event_id");
  const { data: regs } = await admin.from("registrations").select("event_id");

  const videoCount = new Map<string, number>();
  for (const v of videos ?? []) if (v.event_id) videoCount.set(v.event_id, (videoCount.get(v.event_id) ?? 0) + 1);
  const regCount = new Map<string, number>();
  for (const r of regs ?? []) if (r.event_id) regCount.set(r.event_id, (regCount.get(r.event_id) ?? 0) + 1);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Events</h1>
          <p className="mt-1 text-brand-muted">CSMS events and their video packages.</p>
        </div>
        <Link href="/admin/events/new" className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400">
          + New Event
        </Link>
      </div>

      {(events ?? []).length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No events yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="py-3 pr-4">Code</th>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Videos</th>
                <th className="py-3 pr-4">Regs</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(events ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-semibold text-brand-dark">{e.code}</td>
                  <td className="py-3 pr-4 max-w-xs truncate">{e.title}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      e.status === "published" ? "bg-emerald-100 text-emerald-700" : e.status === "closed" ? "bg-gray-200 text-gray-600" : "bg-amber-100 text-amber-700"
                    }`}>{e.status}</span>
                  </td>
                  <td className="py-3 pr-4">{e.price_centavos === 0 ? "Free" : `₱${centavosToPesos(e.price_centavos)}`}</td>
                  <td className="py-3 pr-4">{videoCount.get(e.id) ?? 0}</td>
                  <td className="py-3 pr-4">{regCount.get(e.id) ?? 0}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/events/edit/${e.id}`} className="rounded-lg px-3 py-1.5 text-brand-accent hover:bg-brand-accent/10">Edit</Link>
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" className="rounded-lg px-3 py-1.5 text-brand-red hover:bg-red-50">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
