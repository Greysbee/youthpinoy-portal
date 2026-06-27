"use client";

import AdminShell from "@/components/admin-shell";
import StatusBadge from "@/components/status-badge";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect } from "react";

type UserWithEnrollments = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  enrollments: {
    id: string;
    course_id: string;
    status: "pending" | "paid" | "free";
    enrolled_at: string;
    courses: { title: string } | null;
  }[];
};

export default function AdminEnrollmentsPage() {
  const [users, setUsers] = useState<UserWithEnrollments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*, enrollments(id, course_id, status, enrolled_at, courses(title))")
        .order("created_at", { ascending: false });
      setUsers((data as UserWithEnrollments[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function markPaid(enrollmentId: string) {
    const supabase = createClient();
    await supabase.from("enrollments").update({ status: "paid" }).eq("id", enrollmentId);
    setUsers(
      users.map((u) => ({
        ...u,
        enrollments: u.enrollments.map((e) =>
          e.id === enrollmentId ? { ...e, status: "paid" as const } : e
        ),
      }))
    );
  }

  return (
    <AdminShell>
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Enrollments</h1>
        <p className="mt-1 text-brand-muted">All registered users and their course enrollments.</p>
      </div>

      {loading ? (
        <p className="mt-8 text-brand-muted">Loading...</p>
      ) : users.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No registered users yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-brand-dark">{user.full_name || "—"}</p>
                  <p className="text-sm text-brand-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-brand-muted">
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {user.enrollments.length > 0 ? (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {user.enrollments.map((enrollment) => (
                        <tr key={enrollment.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-brand-dark">
                            {enrollment.courses?.title || "—"}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={enrollment.status} />
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell text-brand-muted">
                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {enrollment.status === "pending" ? (
                              <button
                                onClick={() => markPaid(enrollment.id)}
                                className="min-h-9 rounded-lg bg-brand-green px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
                              >
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
              ) : (
                <div className="border-t border-gray-100 px-5 py-3 text-sm text-brand-muted italic">
                  No course enrollments yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
