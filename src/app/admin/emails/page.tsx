import AdminShell from "@/components/admin-shell";
import { requireSuperAdmin } from "@/lib/admin";
import { buildEmail } from "@/lib/email";
import EmailPreview, { type Preview } from "@/components/admin/email-preview";
import { EMAIL_TYPES, SAMPLE_DATA } from "./samples";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  await requireSuperAdmin();

  const previews: Preview[] = [];
  for (const { type, label } of EMAIL_TYPES) {
    const built = await buildEmail(type, SAMPLE_DATA[type]);
    previews.push({ type, label, subject: built.subject, html: built.html });
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Email templates</h1>
      <p className="mt-1 text-brand-muted">
        Preview each transactional email with sample data, and send a live test to your own inbox.
      </p>
      <div className="mt-6">
        <EmailPreview previews={previews} />
      </div>
    </AdminShell>
  );
}
