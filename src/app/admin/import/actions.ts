"use server";

import {
  requireAdmin,
  normalizeEmail,
  isValidEmail,
  splitEventCell,
  canonicalEventCode,
} from "@/lib/admin";
import { revalidatePath } from "next/cache";

// One mapped row coming from the client wizard (already column-mapped).
export type ImportInputRow = {
  email: string;
  full_name?: string;
  phone?: string;
  organization?: string;
  events?: string;
  all_access?: string;
  legacy_id?: string;
  _file?: string;
};

export type ImportReport = {
  totalRows: number;
  uniqueEmails: number;
  newParticipants: number;
  mergedParticipants: number;
  duplicatesCollapsed: number;
  entitlementsCreated: number;
  invalidEmails: { value: string; file?: string }[];
  unmappedEvents: { email: string; value: string }[];
  perEmail: {
    email: string;
    status: "new" | "merged";
    events: string[];
    allAccess: boolean;
  }[];
};

const TRUTHY = /^(1|true|yes|y|x|✓)$/i;

export async function importParticipants(
  rows: ImportInputRow[]
): Promise<ImportReport> {
  const { admin } = await requireAdmin();

  const report: ImportReport = {
    totalRows: rows.length,
    uniqueEmails: 0,
    newParticipants: 0,
    mergedParticipants: 0,
    duplicatesCollapsed: 0,
    entitlementsCreated: 0,
    invalidEmails: [],
    unmappedEvents: [],
    perEmail: [],
  };

  // ---- 1. Dedupe input by normalized email, aggregating fields ----
  type Agg = {
    email: string;
    full_name?: string;
    phone?: string;
    organization?: string;
    eventTokens: Set<string>;
    allAccess: boolean;
    legacyIds: Set<string>;
  };
  const byEmail = new Map<string, Agg>();

  for (const r of rows) {
    const email = normalizeEmail(r.email || "");
    if (!isValidEmail(email)) {
      report.invalidEmails.push({ value: r.email || "", file: r._file });
      continue;
    }
    let agg = byEmail.get(email);
    if (agg) {
      report.duplicatesCollapsed++;
    } else {
      agg = { email, eventTokens: new Set(), allAccess: false, legacyIds: new Set() };
      byEmail.set(email, agg);
    }
    // keep first non-empty value seen for scalar fields
    if (!agg.full_name && r.full_name?.trim()) agg.full_name = r.full_name.trim();
    if (!agg.phone && r.phone?.trim()) agg.phone = r.phone.trim();
    if (!agg.organization && r.organization?.trim())
      agg.organization = r.organization.trim();
    for (const t of splitEventCell(r.events || "")) agg.eventTokens.add(t);
    if (r.all_access && TRUTHY.test(r.all_access.trim())) agg.allAccess = true;
    if (r.legacy_id?.trim()) agg.legacyIds.add(r.legacy_id.trim());
  }
  report.uniqueEmails = byEmail.size;

  const emails = [...byEmail.keys()];
  if (emails.length === 0) return report;

  // ---- 2. Load existing participants + events ----
  const { data: existingRows } = await admin
    .from("participants")
    .select("id, email, full_name, phone, organization, legacy_ids")
    .in("email", emails);
  const existingByEmail = new Map(
    (existingRows ?? []).map((p) => [p.email as string, p])
  );

  const { data: events } = await admin.from("events").select("id, code");
  const codeToId = new Map(
    (events ?? []).map((e) => [(e.code as string).toUpperCase(), e.id as string])
  );

  // ---- 3. Upsert participants (merge rule: keep existing, fill blanks) ----
  const emailToId = new Map<string, string>();
  const toInsert: Record<string, unknown>[] = [];

  for (const agg of byEmail.values()) {
    const existing = existingByEmail.get(agg.email);
    if (existing) {
      emailToId.set(agg.email, existing.id as string);
      const mergedLegacy = Array.from(
        new Set([...(existing.legacy_ids ?? []), ...agg.legacyIds])
      );
      const patch: Record<string, unknown> = {};
      if (!existing.full_name && agg.full_name) patch.full_name = agg.full_name;
      if (!existing.phone && agg.phone) patch.phone = agg.phone;
      if (!existing.organization && agg.organization)
        patch.organization = agg.organization;
      if (mergedLegacy.length !== (existing.legacy_ids ?? []).length)
        patch.legacy_ids = mergedLegacy;
      if (Object.keys(patch).length > 0) {
        await admin.from("participants").update(patch).eq("id", existing.id);
      }
      report.mergedParticipants++;
    } else {
      toInsert.push({
        email: agg.email,
        full_name: agg.full_name ?? null,
        phone: agg.phone ?? null,
        organization: agg.organization ?? null,
        source: "csv_import",
        legacy_ids: Array.from(agg.legacyIds),
      });
    }
  }

  if (toInsert.length) {
    const { data: inserted, error } = await admin
      .from("participants")
      .insert(toInsert)
      .select("id, email");
    if (error) throw new Error(error.message);
    for (const p of inserted ?? []) emailToId.set(p.email as string, p.id as string);
    report.newParticipants = inserted?.length ?? 0;
  }

  // ---- 4. Resolve event tokens -> event ids per participant ----
  const wantedEntitlements: {
    participant_id: string;
    event_id: string | null;
    type: "event" | "all_access";
  }[] = [];

  for (const agg of byEmail.values()) {
    const pid = emailToId.get(agg.email);
    if (!pid) continue;
    const resolvedCodes: string[] = [];
    for (const token of agg.eventTokens) {
      const canon = (canonicalEventCode(token) ?? token).toUpperCase();
      const eid = codeToId.get(canon);
      if (eid) {
        wantedEntitlements.push({ participant_id: pid, event_id: eid, type: "event" });
        resolvedCodes.push(canon);
      } else {
        report.unmappedEvents.push({ email: agg.email, value: token });
      }
    }
    if (agg.allAccess)
      wantedEntitlements.push({ participant_id: pid, event_id: null, type: "all_access" });

    report.perEmail.push({
      email: agg.email,
      status: existingByEmail.has(agg.email) ? "merged" : "new",
      events: resolvedCodes,
      allAccess: agg.allAccess,
    });
  }

  // ---- 5. Create entitlements idempotently ----
  const pids = [...new Set(wantedEntitlements.map((w) => w.participant_id))];
  if (pids.length) {
    const { data: existingEnts } = await admin
      .from("entitlements")
      .select("participant_id, event_id, type")
      .in("participant_id", pids)
      .is("revoked_at", null);
    const key = (p: string, e: string | null, t: string) => `${p}|${e ?? "all"}|${t}`;
    const have = new Set(
      (existingEnts ?? []).map((e) => key(e.participant_id, e.event_id, e.type))
    );

    const entRows: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const w of wantedEntitlements) {
      const k = key(w.participant_id, w.event_id, w.type);
      if (have.has(k) || seen.has(k)) continue;
      seen.add(k);
      entRows.push({
        participant_id: w.participant_id,
        event_id: w.event_id,
        type: w.type,
        source: "legacy_import",
      });
    }
    if (entRows.length) {
      const { data: created, error } = await admin
        .from("entitlements")
        .insert(entRows)
        .select("id");
      if (error) throw new Error(error.message);
      report.entitlementsCreated = created?.length ?? 0;
    }
  }

  revalidatePath("/admin/participants");
  return report;
}
