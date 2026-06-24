"use client";

import { useState } from "react";
import Link from "next/link";
import type { Course } from "@/lib/mock-data";

export default function CourseForm({ course }: { course?: Course }) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [price, setPrice] = useState(course?.price?.toString() ?? "0");
  const [isPublished, setIsPublished] = useState(course?.is_published ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(`Demo: Would ${course ? "update" : "create"} course "${title}". Supabase not wired yet.`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-brand-dark">
          Course Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
          placeholder="e.g., Catholic Social Media Ministry 101"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-dark">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none resize-y"
          placeholder="Describe what students will learn..."
        />
      </div>

      <div>
        <label htmlFor="cover" className="block text-sm font-medium text-brand-dark">
          Cover Image
        </label>
        <div className="mt-1 flex items-center gap-4">
          <div className="flex h-24 w-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-brand-muted">
            Upload (Supabase)
          </div>
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="price" className="block text-sm font-medium text-brand-dark">
          Price (₱)
        </label>
        <input
          id="price"
          type="number"
          min="0"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPublished}
          onClick={() => setIsPublished(!isPublished)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            isPublished ? "bg-brand-green" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform mt-0.5 ${
              isPublished ? "translate-x-5.5 ml-px" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-brand-dark">
          {isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          {course ? "Save Changes" : "Create Course"}
        </button>
        <Link
          href="/admin"
          className="min-h-11 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-brand-dark hover:bg-gray-50 transition-colors inline-flex items-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
