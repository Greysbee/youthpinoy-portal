import AdminShell from "@/components/admin-shell";
import VideoImport from "@/components/admin/video-import";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function VideoImportPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Import Videos (CSV)</h1>
      <p className="mt-1 text-brand-muted">
        Columns: <code>title, event_code, provider, provider_ref, is_free, thumbnail_url, sort_order</code>
      </p>
      <div className="mt-6">
        <VideoImport />
      </div>
    </AdminShell>
  );
}
