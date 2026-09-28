import AdminShell from "@/components/admin-shell";
import EventForm from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const { admin } = await requireAdmin();
  const { data: allEvents } = await admin
    .from("events")
    .select("id, code, title")
    .order("code");

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">New Event</h1>
      <p className="mt-1 text-brand-muted">Create a CSMS event.</p>
      <div className="mt-6">
        <EventForm allEvents={allEvents ?? []} />
      </div>
    </AdminShell>
  );
}
