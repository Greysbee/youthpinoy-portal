"use client";

import AdminShell from "@/components/admin-shell";
import CourseForm from "@/components/course-form";

export default function NewCoursePage() {
  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">New Course</h1>
      <p className="mt-1 text-brand-muted">Create a new masterclass.</p>
      <div className="mt-6">
        <CourseForm />
      </div>
    </AdminShell>
  );
}
