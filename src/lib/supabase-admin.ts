import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key. It bypasses RLS, so it
// must never be imported into a client component. All access-granting writes and
// every read of secret columns (videos.provider_ref) go through this client.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
