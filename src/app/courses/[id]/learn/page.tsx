"use client";

import Navbar from "@/components/navbar";
import { mockCourses, mockEnrollments } from "@/lib/mock-data";
import { useState, use } from "react";
import Link from "next/link";

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = mockCourses.find((c) => c.id === id);
  const enrollment = mockEnrollments.find(
    (e) => e.course_id === id && (e.status === "paid" || e.status === "free")
  );

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-brand-muted">Course not found.</p>
        </main>
      </>
    );
  }

  if (!enrollment) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-brand-dark">Access Restricted</h1>
            <p className="mt-2 text-brand-muted">
              You need an active enrollment to access this course.
            </p>
            <Link
              href={`/courses/${id}`}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              View Course Details
            </Link>
          </div>
        </main>
      </>
    );
  }

  return <LearnView course={course} />;
}

function LearnView({ course }: { course: (typeof mockCourses)[number] }) {
  const [activeLesson, setActiveLesson] = useState(course.lessons[0] ?? null);

  const courseMaterials = course.materials.filter((m) => m.lesson_id === null);
  const lessonMaterials = activeLesson
    ? course.materials.filter((m) => m.lesson_id === activeLesson.id)
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <Link href="/dashboard" className="text-sm text-brand-muted hover:text-brand-dark">
          ← Dashboard
        </Link>
        <span className="text-sm font-semibold text-brand-dark truncate">{course.title}</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar — lesson list */}
        <aside className="order-2 w-full border-t border-gray-200 bg-white lg:order-1 lg:w-72 lg:border-r lg:border-t-0 lg:overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Lessons</h2>
            <nav className="mt-2 space-y-1">
              {course.lessons
                .sort((a, b) => a.order_index - b.order_index)
                .map((lesson, i) => (
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
          </div>
        </aside>

        {/* Main content */}
        <main className="order-1 flex-1 lg:order-2">
          {activeLesson ? (
            <div>
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://player.vimeo.com/video/${activeLesson.vimeo_id}?h=0&title=0&byline=0&portrait=0`}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4 sm:p-6">
                <h1 className="text-xl font-bold text-brand-dark">{activeLesson.title}</h1>
                <p className="mt-2 text-brand-muted">{activeLesson.description}</p>

                {(lessonMaterials.length > 0 || courseMaterials.length > 0) && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">Materials</h2>
                    <div className="mt-2 space-y-2">
                      {lessonMaterials.map((m) => (
                        <a
                          key={m.id}
                          href={m.file_url}
                          className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <svg className="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          {m.title}
                        </a>
                      ))}
                      {courseMaterials.map((m) => (
                        <a
                          key={m.id}
                          href={m.file_url}
                          className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
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
            <div className="flex h-64 items-center justify-center text-brand-muted">
              No lessons available yet.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
