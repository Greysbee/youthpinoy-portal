"use client";

import AdminShell from "@/components/admin-shell";
import { mockCourses } from "@/lib/mock-data";
import type { Material } from "@/lib/mock-data";
import { useState, use } from "react";
import Link from "next/link";

export default function ManageMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = mockCourses.find((c) => c.id === id);
  const [materials, setMaterials] = useState<Material[]>(course?.materials ?? []);
  const [showNew, setShowNew] = useState(false);

  if (!course) {
    return <AdminShell><p className="text-brand-muted">Course not found.</p></AdminShell>;
  }

  function handleDelete(materialId: string) {
    if (confirm("Delete this material?")) {
      setMaterials(materials.filter((m) => m.id !== materialId));
    }
  }

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Materials</h1>
          <p className="mt-1 text-brand-muted">{course.title}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="min-h-11 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
        >
          + Upload PDF
        </button>
      </div>

      {showNew && (
        <div className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark">Title</label>
            <input
              type="text"
              placeholder="e.g., Lesson 1 Handout"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark">Attach to Lesson (optional)</label>
            <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none">
              <option value="">Course-wide material</option>
              {course.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark">PDF File</label>
            <div className="mt-1 flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-brand-muted">
              File upload (Supabase Storage) — coming when DB is wired
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                alert("Demo: Would upload to Supabase Storage. Not wired yet.");
                setShowNew(false);
              }}
              className="min-h-11 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Upload
            </button>
            <button onClick={() => setShowNew(false)} className="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-brand-dark hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {materials.length === 0 && !showNew ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No materials uploaded yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
              <svg className="h-8 w-8 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-dark truncate">{m.title}</p>
                <p className="text-xs text-brand-muted">
                  {m.lesson_id
                    ? `Lesson: ${course.lessons.find((l) => l.id === m.lesson_id)?.title ?? "Unknown"}`
                    : "Course-wide"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="rounded-lg px-3 py-1.5 text-sm text-brand-red hover:bg-red-50 transition-colors shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
