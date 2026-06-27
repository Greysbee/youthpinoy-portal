"use client";

import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

type Section = { id: string; title: string; order_index: number };
type Lesson = { id: string; title: string; description: string | null; vimeo_url: string | null; vimeo_id: string | null; section_id: string | null; order_index: number };
type Material = { id: string; lesson_id: string | null; title: string; file_url: string };

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setLoading(false); return; }

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("status")
        .eq("user_id", user.id)
        .eq("course_id", id)
        .in("status", ["paid", "free"])
        .single();

      if (!enrollment) { setAccessDenied(true); setLoading(false); return; }

      const { data: courseData } = await supabase.from("courses").select("title").eq("id", id).single();
      const { data: sectionData } = await supabase.from("sections").select("*").eq("course_id", id).order("order_index");
      const { data: lessonData } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_index");
      const { data: materialData } = await supabase.from("course_materials").select("*").eq("course_id", id);

      setCourse(courseData);
      setSections(sectionData ?? []);
      const sortedLessons = lessonData ?? [];
      setLessons(sortedLessons);
      setMaterials(materialData ?? []);
      if (sortedLessons.length > 0) setActiveLesson(sortedLessons[0]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-brand-muted">Loading...</p></div>;
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold text-brand-dark">Access Restricted</h1>
        <p className="mt-2 text-brand-muted">You need an active enrollment to access this course.</p>
        <Link href={`/courses/${id}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
          View Course Details
        </Link>
      </div>
    );
  }

  const courseMaterials = materials.filter((m) => m.lesson_id === null);
  const lessonMaterials = activeLesson ? materials.filter((m) => m.lesson_id === activeLesson.id) : [];
  const hasSections = sections.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <Link href="/dashboard" className="text-sm text-brand-muted hover:text-brand-dark">← Dashboard</Link>
        <span className="text-sm font-semibold text-brand-dark truncate">{course?.title}</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="order-2 w-full border-t border-gray-200 bg-white lg:order-1 lg:w-80 lg:border-r lg:border-t-0 lg:overflow-y-auto">
          <div className="p-4">
            {hasSections ? (
              <div className="space-y-4">
                {sections.sort((a, b) => a.order_index - b.order_index).map((section, si) => {
                  const sectionTopics = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.order_index - b.order_index);
                  return (
                    <div key={section.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                          {si + 1}
                        </span>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">{section.title}</h3>
                      </div>
                      <nav className="ml-2.5 border-l border-gray-200 pl-4 space-y-0.5">
                        {sectionTopics.map((lesson, ti) => (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(lesson)}
                            className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors min-h-10 ${
                              activeLesson?.id === lesson.id
                                ? "bg-brand-blue/10 text-brand-blue font-medium"
                                : "text-brand-dark hover:bg-gray-100"
                            }`}
                          >
                            <span className="mt-0.5 text-xs text-brand-muted shrink-0">{ti + 1}.</span>
                            <span className="line-clamp-2">{lesson.title}</span>
                          </button>
                        ))}
                      </nav>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Topics</h2>
                <nav className="mt-2 space-y-1">
                  {lessons.map((lesson, i) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors min-h-11 ${
                        activeLesson?.id === lesson.id
                          ? "bg-brand-blue/10 text-brand-blue font-medium"
                          : "text-brand-dark hover:bg-gray-100"
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">
                        {i + 1}
                      </span>
                      <span className="line-clamp-2">{lesson.title}</span>
                    </button>
                  ))}
                </nav>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="order-1 flex-1 lg:order-2">
          {activeLesson ? (
            <div>
              <div className="aspect-video bg-black">
                {activeLesson.vimeo_id ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${activeLesson.vimeo_id}?h=0&title=0&byline=0&portrait=0`}
                    className="h-full w-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/50">No video available</div>
                )}
              </div>
              <div className="p-4 sm:p-6">
                <h1 className="text-xl font-bold text-brand-dark">{activeLesson.title}</h1>
                {activeLesson.description && <p className="mt-2 text-brand-muted">{activeLesson.description}</p>}

                {(lessonMaterials.length > 0 || courseMaterials.length > 0) && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">Materials</h2>
                    <div className="mt-2 space-y-2">
                      {lessonMaterials.map((m) => (
                        <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                          <svg className="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          {m.title}
                        </a>
                      ))}
                      {courseMaterials.map((m) => (
                        <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                          <svg className="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          {m.title}
                          <span className="ml-auto text-xs text-brand-muted">Course-wide</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-brand-muted">No topics available yet.</div>
          )}
        </main>
      </div>
    </div>
  );
}
