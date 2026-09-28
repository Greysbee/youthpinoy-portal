import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// /admin is a gate: not signed in -> login; signed-in non-admin -> home;
// admin/super_admin -> into the admin area (Library).
export default async function AdminIndex() {
  await requireAdmin();
  redirect("/admin/videos");
}
