import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendWelcome } from "@/lib/email";

// Sends the welcome email for the currently signed-in user. Called by the client
// right after signup (for projects with email confirmation OFF, a session exists
// immediately). Idempotent via email_log, so calling it more than once is safe.
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "no_session" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("participant_id, email, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.participant_id) return NextResponse.json({ ok: false, reason: "no_participant" });

  const result = await sendWelcome({
    participantId: profile.participant_id,
    email: profile.email ?? user.email ?? "",
    fullName: profile.full_name,
  });
  return NextResponse.json({ ok: result.ok, skipped: result.skipped ?? false });
}
