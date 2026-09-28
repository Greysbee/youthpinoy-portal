import AdminShell from "@/components/admin-shell";
import EventForm from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { admin } = await requireAdmin();

  const { data: event } = await admin.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const { data: includes } = await admin
    .from("event_includes")
    .select("included_event_id")
    .eq("event_id", id);
  const { data: allEvents } = await admin
    .from("events")
    .select("id, code, title")
    .order("code");

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Edit Event</h1>
      <p className="mt-1 text-brand-muted">{event.code}</p>
      <div className="mt-6">
        <EventForm
          allEvents={allEvents ?? []}
          event={{
            ...event,
            includedEventIds: (includes ?? []).map((i) => i.included_event_id),
          }}
        />
      </div>
    </AdminShell>
  );
}
