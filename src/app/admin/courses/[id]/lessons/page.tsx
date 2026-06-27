"use client";

import AdminShell from "@/components/admin-shell";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  vimeo_url: string | null;
  vimeo_id: string | null;
  order_index: number;
};

export default function ManageLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
      setCourseTitle(course?.title ?? "");
      const { data } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_index");
      setLessons(data ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", lessonId);
    setLessons(lessons.filter((l) => l.id !== lessonId));
  }

  async function moveLesson(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;
    const newLessons = [...lessons];
    [newLessons[index], newLessons[target]] = [newLessons[target], newLessons[index]];
    newLessons.forEach((l, i) => (l.order_index = i));
    setLessons(newLessons);

    const supabase = createClient();
    await Promise.all(
      newLessons.map((l) =>
        supabase.from("lessons").update({ order_index: l.order_index }).eq("id", l.id)
      )
    );
  }

  async function handleSave(lesson: Lesson) {
    const supabase = createClient();
    if (lessons.find((l) => l.id === lesson.id)) {
      await supabase.from("lessons").update({
        title: lesson.title,
        description: lesson.description,
        vimeo_url: lesson.vimeo_url,
        vimeo_id: lesson.vimeo_id,
        order_index: lesson.order_index,
      }).eq("id", lesson.id);
      setLessons(lessons.map((l) => (l.id === lesson.id ? lesson : l)));
      setEditing(null);
    } else {
      const { data, error } = await supabase.from("lessons").insert({
        course_id: id,
        title: lesson.title,
        description: lesson.description,
        vimeo_url: lesson.vimeo_url,
        vimeo_id: lesson.vimeo_id,
        order_index: lesson.order_index,
      }).select().single();
      if (error) { alert("Failed to add lesson: " + error.message); return; }
      if (data) setLessons([...lessons, data]);
      setShowNew(false);
    }
  }

  if (loading) return <AdminShell><p className="text-brand-muted">Loading...</p></AdminShell>;

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Lessons</h1>
          <p className="mt-1 text-brand-muted">{courseTitle}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="min-h-11 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors">
          + Add Lesson
        </button>
      </div>

      {showNew && (
        <LessonForm courseId={id} orderIndex={lessons.length}
          onSave={handleSave} onCancel={() => setShowNew(false)} />
      )}

      {lessons.length === 0 && !showNew ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No lessons yet. Add your first one!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {lessons.map((lesson, i) => (
            <div key={lesson.id}>
              {editing === lesson.id ? (
                <LessonForm courseId={id} lesson={lesson} orderIndex={lesson.order_index}
                  onSave={handleSave} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveLesson(i, -1)} disabled={i === 0}
                      className="text-xs text-brand-muted hover:text-brand-dark disabled:opacity-30 min-h-6 min-w-6">▲</button>
                    <button onClick={() => moveLesson(i, 1)} disabled={i === lessons.length - 1}
                      className="text-xs text-brand-muted hover:text-brand-dark disabled:opacity-30 min-h-6 min-w-6">▼</button>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{lesson.title}</p>
                    <p className="text-xs text-brand-muted truncate">{lesson.vimeo_url ?? "No video"}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditing(lesson.id)}
                      className="rounded-lg px-3 py-1.5 text-sm text-brand-accent hover:bg-brand-accent/10 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(lesson.id)}
                      className="rounded-lg px-3 py-1.5 text-sm text-brand-red hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function LessonForm({ courseId, lesson, orderIndex, onSave, onCancel }: {
  courseId: string;
  lesson?: Lesson;
  orderIndex: number;
  onSave: (lesson: Lesson) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [vimeoUrl, setVimeoUrl] = useState(lesson?.vimeo_url ?? "");

  function parseVimeoId(url: string): string {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match?.[1] ?? "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: lesson?.id ?? "",
      course_id: courseId,
      title,
      description,
      vimeo_url: vimeoUrl || null,
      vimeo_id: parseVimeoId(vimeoUrl) || null,
      order_index: orderIndex,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-dark">Lesson Title</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-dark">Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none resize-y" />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-dark">Vimeo URL</label>
        <input type="url" value={vimeoUrl} onChange={(e) => setVimeoUrl(e.target.value)} placeholder="https://vimeo.com/123456789"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none" />
        {vimeoUrl && parseVimeoId(vimeoUrl) && <p className="mt-1 text-xs text-brand-muted">Vimeo ID: {parseVimeoId(vimeoUrl)}</p>}
      </div>
      <div className="flex gap-3">
        <button type="submit" className="min-h-11 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
          {lesson ? "Update" : "Add Lesson"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-brand-dark hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
