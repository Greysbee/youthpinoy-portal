import { redirect } from "next/navigation";

// Participants list moved to /admin/members.
export default function ParticipantsRedirect() {
  redirect("/admin/members");
}
