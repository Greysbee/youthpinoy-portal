import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin, centavosToPesos } from "@/lib/admin";
import { deleteEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const { admin, role } = await requireAdmin();

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
          <p className="mt-1 text-brand-muted">Events and its inclusions.</p>
        </div>
        <div className="flex gap-2">
          {role === "super_admin" && (
            <Link href="/admin/orders" className="inline-flex min-h-11 items-center rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
              View orders
            </Link>
          )}
          <Link href="/admin/events/new" className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400">
            + New Event
          </Link>
        </div>
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
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/events/${e.code}`} target="_blank" title="View / register page" className="rounded-lg p-2 text-brand-muted hover:bg-gray-100 hover:text-brand-dark">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1 1 0 010-.639C3.423 7.51 7.36 4.5 12 4.5s8.577 3.01 9.964 7.183a1 1 0 010 .639C20.577 16.49 16.64 19.5 12 19.5s-8.577-3.01-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </Link>
                      {role === "super_admin" && (
                        <Link href={`/events/${e.code}/orders`} title="Orders for this event" className="rounded-lg p-2 text-brand-muted hover:bg-gray-100 hover:text-brand-dark">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6M9 14h6M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16l-3-2-2 2-2-2-2 2-2-2-2 2z" /></svg>
                        </Link>
                      )}
                      <Link href={`/admin/events/edit/${e.id}`} title="Edit" className="rounded-lg p-2 text-brand-accent hover:bg-brand-accent/10">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897z" /></svg>
                      </Link>
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" title="Delete" className="rounded-lg p-2 text-brand-red hover:bg-red-50">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12M9 7.5V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v1.5m-7.5 0l.66 12.223A1.5 1.5 0 009.32 21h5.36a1.5 1.5 0 001.5-1.277L16.5 7.5" /></svg>
                        </button>
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
