import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Section = { id: string; title: string; order_index: number };
type Lesson = { id: string; title: string; description: string | null; section_id: string | null; order_index: number };

export default async function CoursePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("course_id", id)
    .order("order_index");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, section_id, order_index")
    .eq("course_id", id)
    .order("order_index");

  const allSections = (sections ?? []) as Section[];
  const allLessons = (lessons ?? []) as Lesson[];
  const totalTopics = allLessons.length;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-12 text-white sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4">
              ← Back to Courses
            </Link>
            {course.cover_image_url && (
              <div className="mb-6 overflow-hidden rounded-xl aspect-video max-w-2xl">
                <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                course.type === "event" ? "bg-purple-400/20 text-purple-200" : "bg-blue-400/20 text-blue-200"
              }`}>
                {course.type === "event" ? "Event" : "Course"}
              </span>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl">{course.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold text-brand-gold">
                {course.price === 0 ? "Free" : `₱${Number(course.price).toLocaleString()}`}
              </span>
              <span className="text-white/60">•</span>
              <span className="text-white/80">
                {allSections.length} section{allSections.length !== 1 ? "s" : ""} • {totalTopics} topic{totalTopics !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-brand-dark">Course Syllabus</h2>

              {allSections.length === 0 && allLessons.length === 0 ? (
                <p className="mt-4 text-brand-muted">Content coming soon.</p>
              ) : allSections.length > 0 ? (
                <div className="mt-4 space-y-5">
                  {allSections
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((section, si) => {
                      const sectionTopics = allLessons
                        .filter((l) => l.section_id === section.id)
                        .sort((a, b) => a.order_index - b.order_index);

                      return (
                        <div key={section.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                              {si + 1}
                            </span>
                            <h3 className="font-semibold text-brand-dark">{section.title}</h3>
                            <span className="ml-auto text-xs text-brand-muted">
                              {sectionTopics.length} topic{sectionTopics.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {sectionTopics.length > 0 ? (
                            <ol className="divide-y divide-gray-100">
                              {sectionTopics.map((topic, ti) => (
                                <li key={topic.id} className="flex gap-3 px-4 py-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-blue/10 text-xs font-bold text-brand-blue mt-0.5">
                                    {ti + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-brand-dark">{topic.title}</p>
                                    {topic.description && (
                                      <p className="mt-0.5 text-xs text-brand-muted">{topic.description}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="px-4 py-3 text-sm text-brand-muted italic">No topics yet</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <ol className="mt-4 space-y-3">
                  {allLessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson, i) => (
                      <li key={lesson.id} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-brand-dark">{lesson.title}</p>
                          {lesson.description && (
                            <p className="mt-0.5 text-sm text-brand-muted">{lesson.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                </ol>
              )}
            </div>

            <div className="lg:w-80">
              <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-2xl font-bold text-brand-dark">
                  {course.price === 0 ? "Free" : `₱${Number(course.price).toLocaleString()}`}
                </p>
                <Link
                  href={`/courses/${course.id}/checkout`}
                  className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
                >
                  {course.type === "event" ? "Purchase Now" : "Enroll Now"}
                </Link>
                <ul className="mt-5 space-y-2 text-sm text-brand-muted">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Full course access
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Downloadable materials
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Lifetime access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
