export type Course = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  price: number;
  is_published: boolean;
  lessons: Lesson[];
  materials: Material[];
};

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  vimeo_url: string;
  vimeo_id: string;
  order_index: number;
};

export type Material = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  file_url: string;
  file_type: string;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: "pending" | "paid" | "free";
  enrolled_at: string;
  user_name: string;
  user_email: string;
  course_title: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "admin";
};

export const mockCourses: Course[] = [
  {
    id: "1",
    title: "Catholic Social Media Ministry 101",
    description:
      "Learn the foundations of building an effective online Catholic presence. From creating compelling content to engaging your community, this masterclass covers everything you need to start your digital ministry journey.",
    cover_image_url: "/placeholder-course-1.jpg",
    price: 499,
    is_published: true,
    lessons: [
      {
        id: "l1",
        course_id: "1",
        title: "Introduction to Digital Ministry",
        description: "Understanding the call to evangelize online and how social media can be a powerful tool for faith.",
        vimeo_url: "https://vimeo.com/76979871",
        vimeo_id: "76979871",
        order_index: 0,
      },
      {
        id: "l2",
        course_id: "1",
        title: "Crafting Your Message",
        description: "How to communicate the Gospel effectively in short-form and long-form content.",
        vimeo_url: "https://vimeo.com/76979871",
        vimeo_id: "76979871",
        order_index: 1,
      },
      {
        id: "l3",
        course_id: "1",
        title: "Building Community Online",
        description: "Strategies for growing and nurturing an engaged online faith community.",
        vimeo_url: "https://vimeo.com/76979871",
        vimeo_id: "76979871",
        order_index: 2,
      },
    ],
    materials: [
      { id: "m1", course_id: "1", lesson_id: null, title: "Course Workbook.pdf", file_url: "#", file_type: "pdf" },
      { id: "m2", course_id: "1", lesson_id: "l1", title: "Lesson 1 Handout.pdf", file_url: "#", file_type: "pdf" },
    ],
  },
  {
    id: "2",
    title: "Creative Design for Catholic Content",
    description:
      "Master the art of visual storytelling for your parish, organization, or personal ministry. Learn Canva, basic graphic design principles, and how to create scroll-stopping visuals rooted in faith.",
    cover_image_url: "/placeholder-course-2.jpg",
    price: 799,
    is_published: true,
    lessons: [
      {
        id: "l4",
        course_id: "2",
        title: "Design Thinking for Ministry",
        description: "Why good design matters for evangelization.",
        vimeo_url: "https://vimeo.com/76979871",
        vimeo_id: "76979871",
        order_index: 0,
      },
    ],
    materials: [],
  },
  {
    id: "3",
    title: "Video Production for Online Missionaries",
    description:
      "From smartphone to screen — learn how to plan, shoot, edit, and publish compelling video content that shares the faith with the world.",
    cover_image_url: "/placeholder-course-3.jpg",
    price: 0,
    is_published: true,
    lessons: [],
    materials: [],
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: "e1",
    user_id: "u1",
    course_id: "1",
    status: "paid",
    enrolled_at: "2024-06-15T10:00:00Z",
    user_name: "Maria Santos",
    user_email: "maria@example.com",
    course_title: "Catholic Social Media Ministry 101",
  },
  {
    id: "e2",
    user_id: "u1",
    course_id: "2",
    status: "pending",
    enrolled_at: "2024-06-20T14:30:00Z",
    user_name: "Maria Santos",
    user_email: "maria@example.com",
    course_title: "Creative Design for Catholic Content",
  },
  {
    id: "e3",
    user_id: "u2",
    course_id: "3",
    status: "free",
    enrolled_at: "2024-06-18T09:00:00Z",
    user_name: "Juan dela Cruz",
    user_email: "juan@example.com",
    course_title: "Video Production for Online Missionaries",
  },
];

export const mockUser: UserProfile = {
  id: "u1",
  full_name: "Maria Santos",
  email: "maria@example.com",
  role: "student",
};

export const mockAdmin: UserProfile = {
  id: "admin1",
  full_name: "Admin User",
  email: "admin@youthpinoy.com",
  role: "admin",
};
