import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { deleteVideo, reorderVideo } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const { admin } = await requireAdmin();

  const { data: events } = await admin
    .from("events")
    .select("id, code, title, start_at")
    .order("start_at", { ascending: false });
  const { data: videos } = await admin
    .from("videos")
    .select("id, event_id, title, provider, is_free, sort_order, status")
    .order("sort_order");

  const byEvent = new Map<string, typeof videos>();
  const unassigned: NonNullable<typeof videos> = [];
  for (const v of videos ?? []) {
    if (!v.event_id) unassigned.push(v);
    else {
      if (!byEvent.has(v.event_id)) byEvent.set(v.event_id, []);
      byEvent.get(v.event_id)!.push(v);
    }
  }

  const groups = [
    ...(events ?? []).map((e) => ({ key: e.id, label: `${e.code} · ${e.title}`, videos: byEvent.get(e.id) ?? [] })),
    ...(unassigned.length ? [{ key: "none", label: "Unassigned", videos: unassigned }] : []),
  ].filter((g) => g.videos.length > 0);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Videos</h1>
          <p className="mt-1 text-brand-muted">Recorded sessions, grouped by event.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/videos/import" className="inline-flex min-h-11 items-center rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
            Import CSV
          </Link>
          <Link href="/admin/videos/new" className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400">
            + New Video
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No videos yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <div key={g.key}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-muted">{g.label}</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {g.videos!.map((v, i) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-2 w-16">
                          <div className="flex gap-1">
                            <form action={reorderVideo}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="dir" value="up" />
                              <button disabled={i === 0} className="rounded px-1.5 py-0.5 text-brand-muted hover:bg-gray-200 disabled:opacity-30" title="Move up">↑</button>
                            </form>
                            <form action={reorderVideo}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="dir" value="down" />
                              <button disabled={i === g.videos!.length - 1} className="rounded px-1.5 py-0.5 text-brand-muted hover:bg-gray-200 disabled:opacity-30" title="Move down">↓</button>
                            </form>
                          </div>
                        </td>
                        <td className="py-2 pr-4 font-medium text-brand-dark">{v.title}</td>
                        <td className="py-2 pr-4 text-brand-muted">{v.provider}</td>
                        <td className="py-2 pr-4">
                          {v.is_free && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Free</span>}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{v.status}</span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/videos/edit/${v.id}`} className="rounded-lg px-3 py-1.5 text-brand-accent hover:bg-brand-accent/10">Edit</Link>
                            <form action={deleteVideo}>
                              <input type="hidden" name="id" value={v.id} />
                              <button className="rounded-lg px-3 py-1.5 text-brand-red hover:bg-red-50">Delete</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
