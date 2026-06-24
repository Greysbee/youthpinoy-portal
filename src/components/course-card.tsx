import Link from "next/link";
import type { Course } from "@/lib/mock-data";

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="aspect-video bg-gradient-to-br from-brand-blue to-brand-accent flex items-center justify-center">
        <span className="text-4xl text-white/30 font-bold">YP</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-brand-dark group-hover:text-brand-accent transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="mt-2 flex-1 text-sm text-brand-muted line-clamp-3">
          {course.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-brand-blue">
            {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
          </span>
          <span className="text-xs font-medium text-brand-muted">
            {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
