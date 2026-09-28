import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendWelcome } from "@/lib/email";

// Magic-link / email-OTP confirmation endpoint. Supabase emails a link pointing
// here with a token_hash + type; we verify it, which sets the session cookies,
// then redirect to `next` (defaults to /library).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/library";

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Account is now confirmed/active → send the welcome email (idempotent).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("participant_id, email, full_name")
          .eq("id", user.id)
          .single();
        if (profile?.participant_id) {
          await sendWelcome({
            participantId: profile.participant_id,
            email: profile.email ?? user.email ?? "",
            fullName: profile.full_name,
          });
        }
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link_invalid", request.url));
}
