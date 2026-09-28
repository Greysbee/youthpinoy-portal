"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";

const allNavItems = [
  { href: "/admin/events", label: "Events", icon: "🗓️", roles: ["admin"] },
  { href: "/admin/videos", label: "Videos", icon: "🎬", roles: ["admin"] },
  { href: "/admin/participants", label: "Participants", icon: "🙋", roles: ["admin"] },
  { href: "/admin/import", label: "Import", icon: "📥", roles: ["admin"] },
  { href: "/admin/orders", label: "Orders", icon: "🧾", roles: ["admin"] },
  { href: "/admin", label: "Courses (legacy)", icon: "📚", roles: ["admin", "moderator", "instructor"] },
  { href: "/admin/enrollments", label: "Enrollments (legacy)", icon: "👥", roles: ["admin", "moderator"] },
  { href: "/admin/users", label: "Users & Roles", icon: "🔑", roles: ["admin"] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setRole(data?.role ?? null);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-brand-muted">Loading...</p></div>;
  }

  if (!role || role === "student") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-brand-dark">Access Denied</h1>
          <p className="mt-2 text-brand-muted">You don&apos;t have permission to access this area.</p>
          <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
            <Link href="/" className="text-lg font-bold text-brand-dark">
              <span className="text-brand-gold">Youth</span>Pinoy
            </Link>
            <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue uppercase">
              {role}
            </span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.href ? "bg-brand-blue/10 text-brand-blue" : "text-brand-dark hover:bg-gray-100"
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-3">
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-muted hover:bg-gray-100 transition-colors">
              ← Back to Site
            </Link>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Link href="/" className="font-bold text-brand-dark">
          <span className="text-brand-gold">Youth</span>Pinoy
          <span className="ml-1 rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue uppercase">
            {role}
          </span>
        </Link>
        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                pathname === item.href ? "bg-brand-blue/10 text-brand-blue" : "text-brand-muted"
              }`}>
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
