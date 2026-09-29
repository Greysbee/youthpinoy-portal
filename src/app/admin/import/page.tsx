import AdminShell from "@/components/admin-shell";
import ParticipantImport from "@/components/admin/participant-import";
import { requireSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ImportParticipantsPage() {
  await requireSuperAdmin();
  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Import Participants</h1>
      <p className="mt-1 max-w-2xl text-brand-muted">
        Upload one or more CSVs, map the columns, preview, then commit. Rows are
        deduped by normalized email across files and existing participants; existing
        values are kept and blanks filled from the import. Event columns accept
        formats like <code>CSMSv12</code>, <code>v12</code>, <code>12</code>, or
        comma-separated lists. Re-running the same file changes nothing.
      </p>
      <div className="mt-6">
        <ParticipantImport />
      </div>
    </AdminShell>
  );
}
