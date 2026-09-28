import AdminShell from "@/components/admin-shell";
import VideoForm from "@/components/admin/video-form";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const { data: video } = await admin.from("videos").select("*").eq("id", id).single();
  if (!video) notFound();
  const { data: events } = await admin.from("events").select("id, code, title").order("code");

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Edit Video</h1>
      <div className="mt-6">
        <VideoForm events={events ?? []} video={video} />
      </div>
    </AdminShell>
  );
}
