import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// Guard for every admin page / server action. Redirects non-admins. Returns the
// service-role client (RLS-bypassing) — only reachable after the admin check.
export async function requireAdmin(): Promise<{
  admin: SupabaseClient;
  userId: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) redirect("/");

  return { admin: createAdminClient(), userId: user.id };
}

// trim + lowercase, everywhere, always.
export function normalizeEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

export function pesosToCentavos(input: string | number): number {
  const n = typeof input === "number" ? input : parseFloat(input || "0");
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centavosToPesos(centavos: number): string {
  return (centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- Event-code parsing for CSV import ----------------------------------
// Accepts "CSMSv12", "v12", "12", "CSMS 12", "CSMS v12", and comma/;/|/ separated
// lists. Returns the canonical codes it could form (e.g. "CSMSv12"); the caller
// checks those against the real events and collects anything unmatched.
export function splitEventCell(raw: string): string[] {
  return (raw ?? "")
    .split(/[,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function canonicalEventCode(token: string): string | null {
  const m = token.match(/(\d+)\s*$/);
  if (!m) return null;
  return `CSMSv${m[1]}`;
}
