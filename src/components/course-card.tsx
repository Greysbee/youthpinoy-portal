import Link from "next/link";

type CourseCardProps = {
  course: {
    id: string;
    title: string;
    description: string;
    cover_image_url: string | null;
    price: number;
    lessonCount: number;
    type?: string;
  };
};

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-video bg-gradient-to-br from-brand-blue to-brand-accent flex items-center justify-center overflow-hidden">
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl text-white/30 font-bold">YP</span>
        )}
        <span className={`absolute top-3 left-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          course.type === "event"
            ? "bg-purple-500 text-white"
            : "bg-blue-500 text-white"
        }`}>
          {course.type === "event" ? "Event" : "Course"}
        </span>
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
            {course.price === 0 ? "Free" : `₱${Number(course.price).toLocaleString()}`}
          </span>
          <span className="text-xs font-medium text-brand-muted">
            {course.lessonCount} topic{course.lessonCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
