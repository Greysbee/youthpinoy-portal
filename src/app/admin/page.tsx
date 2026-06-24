"use client";

import Link from "next/link";
import { mockCourses } from "@/lib/mock-data";
import AdminShell from "@/components/admin-shell";
import { useState } from "react";

export default function AdminDashboard() {
  const [courses, setCourses] = useState(mockCourses);

  function handleDelete(id: string) {
    if (confirm("Delete this course?")) {
      setCourses(courses.filter((c) => c.id !== id));
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Courses</h1>
          <p className="mt-1 text-brand-muted">Manage your masterclasses.</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors"
        >
          + New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-brand-muted">No courses yet. Create your first one!</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="py-3 pr-4">Course</th>
                <th className="py-3 pr-4 hidden sm:table-cell">Price</th>
                <th className="py-3 pr-4 hidden sm:table-cell">Lessons</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-brand-dark max-w-xs truncate">
                    {course.title}
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">{course.lessons.length}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        course.is_published ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="rounded-lg px-3 py-1.5 text-brand-accent hover:bg-brand-accent/10 transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/lessons`}
                        className="rounded-lg px-3 py-1.5 text-brand-muted hover:bg-gray-100 transition-colors"
                      >
                        Lessons
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/materials`}
                        className="rounded-lg px-3 py-1.5 text-brand-muted hover:bg-gray-100 transition-colors"
                      >
                        Files
                      </Link>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="rounded-lg px-3 py-1.5 text-brand-red hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
