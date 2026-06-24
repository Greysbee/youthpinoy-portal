"use client";

import AdminShell from "@/components/admin-shell";
import { mockCourses } from "@/lib/mock-data";
import { useState, use } from "react";
import type { Lesson } from "@/lib/mock-data";
import Link from "next/link";

export default function ManageLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = mockCourses.find((c) => c.id === id);
  const [lessons, setLessons] = useState<Lesson[]>(course?.lessons ?? []);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  if (!course) {
    return <AdminShell><p className="text-brand-muted">Course not found.</p></AdminShell>;
  }

  function handleDelete(lessonId: string) {
    if (confirm("Delete this lesson?")) {
      setLessons(lessons.filter((l) => l.id !== lessonId));
    }
  }

  function moveLesson(index: number, direction: -1 | 1) {
    const newLessons = [...lessons];
    const target = index + direction;
    if (target < 0 || target >= newLessons.length) return;
    [newLessons[index], newLessons[target]] = [newLessons[target], newLessons[index]];
    newLessons.forEach((l, i) => (l.order_index = i));
    setLessons(newLessons);
  }

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Lessons</h1>
          <p className="mt-1 text-brand-muted">{course.title}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="min-h-11 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
        >
          + Add Lesson
        </button>
      </div>

      {showNew && (
        <LessonForm
          courseId={id}
          orderIndex={lessons.length}
          onSave={(lesson) => {
            setLessons([...lessons, lesson]);
            setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {lessons.length === 0 && !showNew ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No lessons yet. Add your first one!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {lessons
            .sort((a, b) => a.order_index - b.order_index)
            .map((lesson, i) => (
              <div key={lesson.id}>
                {editing === lesson.id ? (
                  <LessonForm
                    courseId={id}
                    lesson={lesson}
                    orderIndex={lesson.order_index}
                    onSave={(updated) => {
                      setLessons(lessons.map((l) => (l.id === updated.id ? updated : l)));
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveLesson(i, -1)}
                        disabled={i === 0}
                        className="text-xs text-brand-muted hover:text-brand-dark disabled:opacity-30 min-h-6 min-w-6"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveLesson(i, 1)}
                        disabled={i === lessons.length - 1}
                        className="text-xs text-brand-muted hover:text-brand-dark disabled:opacity-30 min-h-6 min-w-6"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brand-dark truncate">{lesson.title}</p>
                      <p className="text-xs text-brand-muted truncate">{lesson.vimeo_url}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setEditing(lesson.id)}
                        className="rounded-lg px-3 py-1.5 text-sm text-brand-accent hover:bg-brand-accent/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(lesson.id)}
                        className="rounded-lg px-3 py-1.5 text-sm text-brand-red hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
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

function LessonForm({
  courseId,
  lesson,
  orderIndex,
  onSave,
  onCancel,
}: {
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
      id: lesson?.id ?? `l_${Date.now()}`,
      course_id: courseId,
      title,
      description,
      vimeo_url: vimeoUrl,
      vimeo_id: parseVimeoId(vimeoUrl),
      order_index: orderIndex,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-dark">Lesson Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-dark">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-dark">Vimeo URL</label>
        <input
          type="url"
          required
          value={vimeoUrl}
          onChange={(e) => setVimeoUrl(e.target.value)}
          placeholder="https://vimeo.com/123456789"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
        />
        {vimeoUrl && parseVimeoId(vimeoUrl) && (
          <p className="mt-1 text-xs text-brand-muted">Vimeo ID: {parseVimeoId(vimeoUrl)}</p>
        )}
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
