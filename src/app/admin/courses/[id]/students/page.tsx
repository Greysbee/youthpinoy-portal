"use client";

import AdminShell from "@/components/admin-shell";
import StatusBadge from "@/components/status-badge";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

type StudentEnrollment = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "free";
  enrolled_at: string;
  profiles: { full_name: string; email: string } | null;
};

export default function CourseStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
      setCourseTitle(course?.title ?? "");
      const { data } = await supabase
        .from("enrollments")
        .select("*, profiles(full_name, email)")
        .eq("course_id", id)
        .order("enrolled_at", { ascending: false });
      setStudents((data as StudentEnrollment[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function markPaid(enrollmentId: string) {
    const supabase = createClient();
    await supabase.from("enrollments").update({ status: "paid" }).eq("id", enrollmentId);
    setStudents(students.map((s) => s.id === enrollmentId ? { ...s, status: "paid" as const } : s));
  }

  if (loading) return <AdminShell><p className="text-brand-muted">Loading...</p></AdminShell>;

  const activeCount = students.filter((s) => s.status === "paid" || s.status === "free").length;
  const pendingCount = students.filter((s) => s.status === "pending").length;

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Students</h1>
          <p className="mt-1 text-brand-muted">{courseTitle}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">{activeCount} Active</span>
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700">{pendingCount} Pending</span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No students enrolled yet.</p>
        </div>
      ) : (
        <div className="mt-6 max-h-[70vh] overflow-auto frozen-head">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="py-3 pr-4">Student</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 hidden sm:table-cell">Enrolled</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-brand-dark">{student.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-brand-muted">{student.profiles?.email || "—"}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-brand-muted">
                    {new Date(student.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    {student.status === "pending" ? (
                      <button onClick={() => markPaid(student.id)}
                        className="min-h-9 rounded-lg bg-brand-green px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
                        Mark as Paid
                      </button>
                    ) : (
                      <span className="text-xs text-brand-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
