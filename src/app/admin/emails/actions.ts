"use server";

import { requireSuperAdmin } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildEmail, deliver, type EmailType } from "@/lib/email";
import { SAMPLE_DATA } from "./samples";

export type TestState = { error?: string; notice?: string };

export async function sendTestEmail(_prev: TestState, formData: FormData): Promise<TestState> {
  await requireSuperAdmin();
  const type = formData.get("type") as EmailType;
  if (!SAMPLE_DATA[type]) return { error: "Unknown template." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const to = user?.email;
  if (!to) return { error: "No admin email on file." };

  const built = await buildEmail(type, SAMPLE_DATA[type]);
  const res = await deliver({
    to,
    subject: `[TEST] ${built.subject}`,
    html: built.html,
    text: built.text,
    attachments: built.attachments,
  });
  return res.ok
    ? { notice: `Test "${type}" sent to ${to}.` }
    : { error: `Send failed: ${res.error}` };
}
