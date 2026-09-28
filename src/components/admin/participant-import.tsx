"use client";

import { useState } from "react";
import Link from "next/link";
import { csvToObjects, toCsv } from "@/lib/csv";
import {
  importParticipants,
  type ImportInputRow,
  type ImportReport,
} from "@/app/admin/import/actions";

type ParsedFile = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

type Mapping = {
  email: string;
  full_name: string;
  phone: string;
  organization: string;
  events: string;
  all_access: string;
  legacy_id: string;
};

const TARGETS: { key: keyof Mapping; label: string; required?: boolean }[] = [
  { key: "email", label: "Email", required: true },
  { key: "full_name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "organization", label: "Organization" },
  { key: "events", label: "Events" },
  { key: "all_access", label: "All-access" },
  { key: "legacy_id", label: "Legacy ID" },
];

function guess(headers: string[]): Mapping {
  const find = (re: RegExp) => headers.find((h) => re.test(h.toLowerCase())) ?? "";
  return {
    email: find(/e-?mail/),
    full_name: find(/name/),
    phone: find(/phone|mobile|contact|cell/),
    organization: find(/org|company|parish|school|diocese/),
    events: find(/event|csms|summit|package|access(?!.*all)/),
    all_access: find(/all.?access|lifetime/),
    legacy_id: find(/^id$|legacy|member.?id/),
  };
}

export default function ParticipantImport() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [maps, setMaps] = useState<Mapping[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setReport(null);
    const list = Array.from(e.target.files ?? []);
    const parsed: ParsedFile[] = [];
    for (const f of list) {
      const text = await f.text();
      const { headers, rows } = csvToObjects(text);
      parsed.push({ name: f.name, headers, rows });
    }
    setFiles(parsed);
    setMaps(parsed.map((p) => guess(p.headers)));
  }

  function setMap(fileIdx: number, key: keyof Mapping, value: string) {
    setMaps((m) => m.map((x, i) => (i === fileIdx ? { ...x, [key]: value } : x)));
  }

  function buildRows(): ImportInputRow[] {
    const out: ImportInputRow[] = [];
    files.forEach((f, i) => {
      const map = maps[i];
      if (!map?.email) return;
      for (const row of f.rows) {
        const email = row[map.email];
        if (!email) continue;
        out.push({
          email,
          full_name: map.full_name ? row[map.full_name] : undefined,
          phone: map.phone ? row[map.phone] : undefined,
          organization: map.organization ? row[map.organization] : undefined,
          events: map.events ? row[map.events] : undefined,
          all_access: map.all_access ? row[map.all_access] : undefined,
          legacy_id: map.legacy_id ? row[map.legacy_id] : undefined,
          _file: f.name,
        });
      }
    });
    return out;
  }

  const preview = files.length ? buildRows() : [];
  const canCommit = files.length > 0 && maps.every((m) => m.email);

  async function onCommit() {
    setBusy(true);
    setError("");
    try {
      const r = await importParticipants(buildRows());
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const rows = [
      ...report.perEmail.map((p) => ({
        email: p.email,
        status: p.status,
        events: p.events.join(" "),
        all_access: p.allAccess ? "yes" : "",
        issue: "",
      })),
      ...report.invalidEmails.map((v) => ({
        email: v.value,
        status: "invalid",
        events: "",
        all_access: "",
        issue: `invalid email (${v.file ?? ""})`,
      })),
      ...report.unmappedEvents.map((u) => ({
        email: u.email,
        status: "unmapped_event",
        events: u.value,
        all_access: "",
        issue: `unmapped event value "${u.value}"`,
      })),
    ];
    const csv = toCsv(rows, ["email", "status", "events", "all_access", "issue"]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const sel =
    "rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-accent";

  return (
    <div className="space-y-6">
      <input
        type="file"
        accept=".csv,text/csv"
        multiple
        onChange={onFiles}
        className="block w-full text-sm text-brand-dark file:mr-4 file:rounded-lg file:border-0 file:bg-brand-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Column mapping per file */}
      {!report &&
        files.map((f, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-brand-dark">
              {f.name} <span className="text-brand-muted">({f.rows.length} rows)</span>
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TARGETS.map((t) => (
                <label key={t.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-brand-dark">
                    {t.label}
                    {t.required && <span className="text-brand-red"> *</span>}
                  </span>
                  <select
                    value={maps[i]?.[t.key] ?? ""}
                    onChange={(e) => setMap(i, t.key, e.target.value)}
                    className={sel}
                  >
                    <option value="">— none —</option>
                    {f.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}

      {/* Preview */}
      {!report && preview.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-brand-dark">
            Preview: <strong>{preview.length}</strong> mapped rows across {files.length} file(s).
          </p>
          <div className="mt-3 max-h-60 overflow-auto rounded border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">email</th>
                  <th className="px-2 py-1 text-left">name</th>
                  <th className="px-2 py-1 text-left">events</th>
                  <th className="px-2 py-1 text-left">all_access</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 15).map((r, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-2 py-1">{r.email}</td>
                    <td className="px-2 py-1">{r.full_name}</td>
                    <td className="px-2 py-1">{r.events}</td>
                    <td className="px-2 py-1">{r.all_access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={onCommit}
            disabled={!canCommit || busy}
            className="mt-4 min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Importing…" : "Commit import"}
          </button>
          {!canCommit && (
            <p className="mt-2 text-xs text-brand-red">Every file needs an Email column mapped.</p>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-800">Import complete</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="Rows processed" value={report.totalRows} />
            <Stat label="Unique emails" value={report.uniqueEmails} />
            <Stat label="New" value={report.newParticipants} />
            <Stat label="Merged" value={report.mergedParticipants} />
            <Stat label="Duplicates collapsed" value={report.duplicatesCollapsed} />
            <Stat label="Entitlements created" value={report.entitlementsCreated} />
            <Stat label="Invalid emails" value={report.invalidEmails.length} />
            <Stat label="Unmapped events" value={report.unmappedEvents.length} />
          </div>

          {report.invalidEmails.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-amber-800">
                Invalid emails ({report.invalidEmails.length})
              </summary>
              <ul className="mt-1 list-inside list-disc text-amber-800">
                {report.invalidEmails.slice(0, 30).map((v, i) => (
                  <li key={i}>{v.value || "(blank)"} {v.file ? `· ${v.file}` : ""}</li>
                ))}
              </ul>
            </details>
          )}
          {report.unmappedEvents.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium text-amber-800">
                Unmapped event values ({report.unmappedEvents.length})
              </summary>
              <ul className="mt-1 list-inside list-disc text-amber-800">
                {report.unmappedEvents.slice(0, 30).map((u, i) => (
                  <li key={i}>&quot;{u.value}&quot; → {u.email}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-4 flex gap-3">
            <button onClick={downloadReport} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Download report CSV
            </button>
            <Link href="/admin/participants" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-gray-50">
              View participants
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-lg font-bold text-brand-dark">{value}</p>
      <p className="text-xs text-brand-muted">{label}</p>
    </div>
  );
}
