"use client";

import AdminShell from "@/components/admin-shell";
import StatusBadge from "@/components/status-badge";
import { mockEnrollments } from "@/lib/mock-data";
import { useState } from "react";

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState(mockEnrollments);

  function markPaid(enrollmentId: string) {
    setEnrollments(
      enrollments.map((e) =>
        e.id === enrollmentId ? { ...e, status: "paid" as const } : e
      )
    );
  }

  return (
    <AdminShell>
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Enrollments</h1>
        <p className="mt-1 text-brand-muted">
          Manage student enrollments and payment confirmations.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No enrollments yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="py-3 pr-4">Student</th>
                <th className="py-3 pr-4 hidden sm:table-cell">Course</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 hidden md:table-cell">Enrolled</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-brand-dark">{enrollment.user_name}</p>
                    <p className="text-xs text-brand-muted">{enrollment.user_email}</p>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-brand-dark max-w-xs truncate">
                    {enrollment.course_title}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={enrollment.status} />
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell text-brand-muted">
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
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
      )}
    </AdminShell>
  );
}
