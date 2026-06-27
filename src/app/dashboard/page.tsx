import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import StatusBadge from "@/components/status-badge";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(id, title, lessons(id))")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  const items = enrollments ?? [];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-dark">My Virtual Library</h1>
          <p className="mt-1 text-brand-muted">Your enrolled courses, events, and learning progress.</p>

          {items.length === 0 ? (
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
              {items.map((enrollment: Record<string, unknown>) => {
                const course = enrollment.courses as { id: string; title: string; lessons: { id: string }[] } | null;
                const status = enrollment.status as "paid" | "free" | "pending";
                const canAccess = status === "paid" || status === "free";

                return (
                  <div
                    key={enrollment.id as string}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-brand-dark">{course?.title ?? "Unknown Course"}</h2>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-1 text-sm text-brand-muted">
                        Enrolled {new Date(enrollment.enrolled_at as string).toLocaleDateString()}
                        {course && ` • ${course.lessons?.length ?? 0} lessons`}
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
