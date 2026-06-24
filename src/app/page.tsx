import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { mockCourses } from "@/lib/mock-data";

export default function HomePage() {
  const publishedCourses = mockCourses.filter((c) => c.is_published);

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
          <h2 className="text-2xl font-bold text-brand-dark">Available Courses</h2>
          <p className="mt-1 text-brand-muted">Browse our digital masterclasses and start learning today.</p>

          {publishedCourses.length === 0 ? (
            <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
              <p className="text-brand-muted">No courses available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {publishedCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
