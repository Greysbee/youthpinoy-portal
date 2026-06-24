import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { mockCourses } from "@/lib/mock-data";
import { notFound } from "next/navigation";

export default async function CoursePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = mockCourses.find((c) => c.id === id);
  if (!course) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-12 text-white sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4">
              ← Back to Courses
            </Link>
            <h1 className="text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl">{course.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold text-brand-gold">
                {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
              </span>
              <span className="text-white/60">•</span>
              <span className="text-white/80">
                {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-brand-dark">Course Syllabus</h2>
              {course.lessons.length === 0 ? (
                <p className="mt-4 text-brand-muted">Lessons coming soon.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {course.lessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson, i) => (
                      <li
                        key={lesson.id}
                        className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-brand-dark">{lesson.title}</p>
                          <p className="mt-0.5 text-sm text-brand-muted">{lesson.description}</p>
                        </div>
                      </li>
                    ))}
                </ol>
              )}
            </div>

            <div className="lg:w-80">
              <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-2xl font-bold text-brand-dark">
                  {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
                </p>
                <Link
                  href={`/courses/${course.id}/checkout`}
                  className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
                >
                  Enroll Now
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
