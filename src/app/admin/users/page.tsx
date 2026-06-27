"use client";

import AdminShell from "@/components/admin-shell";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect } from "react";

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
};

const ROLES = [
  { value: "student", label: "Student", color: "bg-blue-100 text-blue-700" },
  { value: "instructor", label: "Instructor", color: "bg-teal-100 text-teal-700" },
  { value: "moderator", label: "Moderator", color: "bg-orange-100 text-orange-700" },
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-700" },
];

function getRoleStyle(role: string) {
  return ROLES.find((r) => r.value === role)?.color ?? "bg-gray-100 text-gray-700";
}

function getRoleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function changeRole(userId: string, newRole: string) {
    setUpdating(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      alert("Failed to update role: " + error.message);
    } else {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
    setUpdating(null);
  }

  const filteredUsers = filter === "all" ? users : users.filter((u) => u.role === filter);

  const roleCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    moderator: users.filter((u) => u.role === "moderator").length,
    instructor: users.filter((u) => u.role === "instructor").length,
    student: users.filter((u) => u.role === "student").length,
  };

  return (
    <AdminShell>
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Users & Roles</h1>
        <p className="mt-1 text-brand-muted">Manage user roles and permissions.</p>
      </div>

      {/* Role filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "admin", label: "Admins" },
          { key: "moderator", label: "Moderators" },
          { key: "instructor", label: "Instructors" },
          { key: "student", label: "Students" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-brand-blue text-white"
                : "bg-gray-100 text-brand-dark hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">
              ({roleCounts[tab.key as keyof typeof roleCounts]})
            </span>
          </button>
        ))}
      </div>

      {/* Role descriptions */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Role Permissions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-brand-muted">
          <div><span className="font-semibold text-purple-700">Admin</span> — Full access to all features, manage users & roles</div>
          <div><span className="font-semibold text-orange-700">Moderator</span> — Access, manage & edit courses and enrollments</div>
          <div><span className="font-semibold text-teal-700">Instructor</span> — Access, manage & edit assigned courses</div>
          <div><span className="font-semibold text-blue-700">Student</span> — Browse courses & access enrolled content only</div>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-brand-muted">Loading...</p>
      ) : filteredUsers.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-brand-muted">No users found.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Current Role</th>
                <th className="py-3 pr-4 hidden sm:table-cell">Joined</th>
                <th className="py-3 text-right">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-brand-dark">{user.full_name || "—"}</p>
                    <p className="text-xs text-brand-muted">{user.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleStyle(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-brand-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      disabled={updating === user.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
