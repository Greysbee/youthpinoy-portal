"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price: number;
  type: string;
  lessons: { id: string }[];
};

export default function HomePage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, cover_image_url, price, type, lessons(id)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setCourses(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Become an <span className="text-brand-gold">Online Missionary</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Equipping empowered, inspired, and spiritually-driven digital missionaries through creative trainings and masterclasses.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-bold text-brand-dark">Available Courses and Events</h2>
          <p className="mt-1 text-brand-muted">Browse our digital masterclasses and start learning today.</p>

          {loading ? (
            <p className="mt-8 text-brand-muted">Loading...</p>
          ) : courses.length === 0 ? (
            <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
              <p className="text-brand-muted">No courses available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    description: course.description ?? "",
                    cover_image_url: course.cover_image_url,
                    price: course.price,
                    type: course.type,
                    lessonCount: course.lessons?.length ?? 0,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
