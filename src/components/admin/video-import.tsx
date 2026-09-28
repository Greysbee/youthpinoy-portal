"use client";

import { useState } from "react";
import Link from "next/link";
import { csvToObjects } from "@/lib/csv";
import { importVideos, type VideoImportReport } from "@/app/admin/videos/actions";

export default function VideoImport() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [report, setReport] = useState<VideoImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setReport(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, rows } = csvToObjects(text);
    setHeaders(headers);
    setRows(rows);
  }

  async function onImport() {
    setBusy(true);
    setError("");
    try {
      const r = await importVideos(rows);
      setReport(r);
    } catch {
      setError("Import failed. Check the console/logs.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        className="block w-full text-sm text-brand-dark file:mr-4 file:rounded-lg file:border-0 file:bg-brand-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {rows.length > 0 && !report && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-brand-dark">
            <strong>{rows.length}</strong> rows detected. Columns: {headers.join(", ")}
          </p>
          <div className="mt-3 max-h-60 overflow-auto rounded border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{headers.map((h) => <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {headers.map((h) => <td key={h} className="px-2 py-1">{r[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={onImport}
            disabled={busy}
            className="mt-4 min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Importing…" : `Import ${rows.length} videos`}
          </button>
        </div>
      )}

      {report && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">Imported {report.inserted} videos.</p>
          {report.failed.length > 0 && (
            <div className="mt-2 text-sm text-amber-800">
              <p className="font-medium">{report.failed.length} skipped:</p>
              <ul className="mt-1 list-inside list-disc">
                {report.failed.slice(0, 20).map((f, i) => (
                  <li key={i}>Row {f.row}: {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/admin/videos" className="mt-3 inline-block text-sm font-semibold text-brand-accent hover:underline">
            ← Back to videos
          </Link>
        </div>
      )}
    </div>
  );
}
