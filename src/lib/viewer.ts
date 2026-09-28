import { createServerSupabaseClient } from "@/lib/supabase-server";

export type Viewer = {
  userId: string;
  participantId: string | null;
  email: string | null;
  fullName: string | null;
  role: string | null;
};

// The current signed-in user with their linked participant, or null.
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("participant_id, email, full_name, role")
    .eq("id", user.id)
    .single();
  return {
    userId: user.id,
    participantId: (data?.participant_id as string) ?? null,
    email: (data?.email as string) ?? user.email ?? null,
    fullName: (data?.full_name as string) ?? null,
    role: (data?.role as string) ?? null,
  };
}
