import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import StatusBadge from "@/components/status-badge";
import Link from "next/link";
import { mockEnrollments, mockCourses } from "@/lib/mock-data";

export default function DashboardPage() {
  const enrollments = mockEnrollments.filter((e) => e.user_id === "u1");

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-dark">My Courses</h1>
          <p className="mt-1 text-brand-muted">Your enrolled courses and learning progress.</p>

          {enrollments.length === 0 ? (
            <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
              <p className="text-brand-muted">You haven&apos;t enrolled in any courses yet.</p>
              <Link
                href="/"
                className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {enrollments.map((enrollment) => {
                const course = mockCourses.find((c) => c.id === enrollment.course_id);
                const canAccess = enrollment.status === "paid" || enrollment.status === "free";

                return (
                  <div
                    key={enrollment.id}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-brand-dark">{enrollment.course_title}</h2>
                        <StatusBadge status={enrollment.status} />
                      </div>
                      <p className="mt-1 text-sm text-brand-muted">
                        Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        {course && ` • ${course.lessons.length} lessons`}
                      </p>
                    </div>
                    <div>
                      {canAccess ? (
                        <Link
                          href={`/courses/${enrollment.course_id}/learn`}
                          className="inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                        >
                          Continue Learning →
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-11 items-center rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-brand-muted">
                          Awaiting Payment Confirmation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
