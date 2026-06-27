"use client";

import AdminShell from "@/components/admin-shell";
import CourseForm from "@/components/course-form";
import { createClient } from "@/lib/supabase-client";
import { use, useEffect, useState } from "react";

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<{ id: string; title: string; description: string | null; price: number; is_published: boolean; type: string; cover_image_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("courses")
      .select("id, title, description, price, is_published, type, cover_image_url")
      .eq("id", id)
      .single()
      .then(({ data }) => { setCourse(data); setLoading(false); });
  }, [id]);

  if (loading) return <AdminShell><p className="text-brand-muted">Loading...</p></AdminShell>;
  if (!course) return <AdminShell><p className="text-brand-muted">Course not found.</p></AdminShell>;

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
