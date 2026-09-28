"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";

type CardItem = {
  key: string;
  href: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  price: number;
  lessonCount: number;
  type: string;
  createdAt: string;
};

export default function HomePage() {
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: courses }, { data: events }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, description, cover_image_url, price, type, created_at, lessons(id)")
          .eq("is_published", true),
        supabase
          .from("events")
          .select("id, title, slug, description, cover_image_url, price_centavos, created_at, videos(id)")
          .eq("status", "published"),
      ]);

      const courseItems: CardItem[] = (courses ?? []).map((c) => ({
        key: `course-${c.id}`,
        href: `/courses/${c.id}`,
        title: c.title,
        description: c.description ?? "",
        cover_image_url: c.cover_image_url,
        price: Number(c.price ?? 0),
        lessonCount: c.lessons?.length ?? 0,
        type: c.type ?? "course",
        createdAt: c.created_at ?? "",
      }));

      const eventItems: CardItem[] = (events ?? []).map((e) => ({
        key: `event-${e.id}`,
        href: `/events/${e.slug}`,
        title: e.title,
        description: e.description ?? "",
        cover_image_url: e.cover_image_url,
        price: (e.price_centavos ?? 0) / 100,
        lessonCount: e.videos?.length ?? 0,
        type: "event",
        createdAt: e.created_at ?? "",
      }));

      const merged = [...eventItems, ...courseItems].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      );
      setItems(merged);
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
              Become a <span className="text-brand-gold">Catholic Digital Missionary</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Equipping empowered, inspired, and spiritually-driven digital missionaries through creative trainings and masterclasses.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-bold text-brand-dark">Courses and Events</h2>
          <p className="mt-1 text-brand-muted">Browse our digital masterclasses and summits — start learning today.</p>

          {loading ? (
            <p className="mt-8 text-brand-muted">Loading...</p>
          ) : items.length === 0 ? (
            <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
              <p className="text-brand-muted">Nothing available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <CourseCard
                  key={item.key}
                  href={item.href}
                  course={{
                    id: item.key,
                    title: item.title,
                    description: item.description,
                    cover_image_url: item.cover_image_url,
                    price: item.price,
                    type: item.type,
                    lessonCount: item.lessonCount,
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
