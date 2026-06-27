"use client";

import AdminShell from "@/components/admin-shell";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

type Material = { id: string; course_id: string; lesson_id: string | null; title: string; file_url: string; file_type: string };
type Lesson = { id: string; title: string };

export default function ManageMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLessonId, setNewLessonId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
      setCourseTitle(course?.title ?? "");
      const { data: lessonData } = await supabase.from("lessons").select("id, title").eq("course_id", id).order("order_index");
      setLessons(lessonData ?? []);
      const { data: matData } = await supabase.from("course_materials").select("*").eq("course_id", id).order("created_at");
      setMaterials(matData ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    const supabase = createClient();
    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, file);
    if (uploadError) { alert("Storage upload failed: " + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(filePath);

    const { data, error: insertError } = await supabase.from("course_materials").insert({
      course_id: id,
      lesson_id: newLessonId || null,
      title: newTitle || file.name,
      file_url: publicUrl,
      file_type: file.name.split(".").pop() ?? "file",
    }).select().single();

    if (insertError) { alert("DB insert failed: " + insertError.message); setUploading(false); return; }
    if (data) setMaterials([...materials, data]);
    setShowNew(false);
    setNewTitle("");
    setNewLessonId("");
    setFile(null);
    setUploading(false);
  }

  async function handleDelete(materialId: string, fileUrl: string) {
    if (!confirm("Delete this material?")) return;
    const supabase = createClient();

    const pathMatch = fileUrl.match(/\/materials\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from("materials").remove([pathMatch[1]]);
    }

    await supabase.from("course_materials").delete().eq("id", materialId);
    setMaterials(materials.filter((m) => m.id !== materialId));
  }

  if (loading) return <AdminShell><p className="text-brand-muted">Loading...</p></AdminShell>;

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Materials</h1>
          <p className="mt-1 text-brand-muted">{courseTitle}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="min-h-11 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors">
          + Upload File
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleUpload} className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark">Title</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Lesson 1 Handout"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark">Attach to Lesson (optional)</label>
            <select value={newLessonId} onChange={(e) => setNewLessonId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none">
              <option value="">Course-wide material</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark">File</label>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-brand-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={uploading}
              className="min-h-11 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button type="button" onClick={() => setShowNew(false)}
              className="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-brand-dark hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
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
                  {m.lesson_id ? `Lesson: ${lessons.find((l) => l.id === m.lesson_id)?.title ?? "Unknown"}` : "Course-wide"}
                </p>
              </div>
              <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-sm text-brand-accent hover:bg-brand-accent/10 transition-colors shrink-0">View</a>
              <button onClick={() => handleDelete(m.id, m.file_url)}
                className="rounded-lg px-3 py-1.5 text-sm text-brand-red hover:bg-red-50 transition-colors shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
