import AdminShell from "@/components/admin-shell";
import VideoForm from "@/components/admin/video-form";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  const { admin } = await requireAdmin();
  const { data: events } = await admin.from("events").select("id, code, title").order("code");
  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">New Video</h1>
      <div className="mt-6">
        <VideoForm events={events ?? []} />
      </div>
    </AdminShell>
  );
}
