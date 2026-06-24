"use client";

import AdminShell from "@/components/admin-shell";
import CourseForm from "@/components/course-form";
import { mockCourses } from "@/lib/mock-data";
import { use } from "react";

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = mockCourses.find((c) => c.id === id);

  if (!course) {
    return (
      <AdminShell>
        <p className="text-brand-muted">Course not found.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Edit Course</h1>
      <p className="mt-1 text-brand-muted">Update course details.</p>
      <div className="mt-6">
        <CourseForm course={course} />
      </div>
    </AdminShell>
  );
}
