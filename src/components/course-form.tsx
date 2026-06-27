"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

type CourseData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_published: boolean;
  type: string;
  cover_image_url: string | null;
};

export default function CourseForm({ course }: { course?: CourseData }) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [price, setPrice] = useState(course?.price?.toString() ?? "0");
  const [isPublished, setIsPublished] = useState(course?.is_published ?? false);
  const [type, setType] = useState(course?.type ?? "course");
  const [coverPreview, setCoverPreview] = useState(course?.cover_image_url ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    let coverUrl = course?.cover_image_url ?? null;

    if (coverFile) {
      const filePath = `covers/${Date.now()}_${coverFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, coverFile);
      if (uploadError) { setError("Cover upload failed: " + uploadError.message); setLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(filePath);
      coverUrl = publicUrl;
    }

    const payload = {
      title,
      description,
      price: parseFloat(price) || 0,
      is_published: isPublished,
      type,
      cover_image_url: coverUrl,
    };

    if (course) {
      const { error: updateError } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", course.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
    } else {
      const { error: insertError } = await supabase
        .from("courses")
        .insert(payload);
      if (insertError) { setError(insertError.message); setLoading(false); return; }
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-brand-dark">Cover Image</label>
        <div className="mt-1 flex items-start gap-4">
          <div className="relative flex h-32 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-brand-muted text-center px-2">No image selected</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleCoverChange}
              className="text-sm text-brand-dark file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20"
            />
            <p className="text-xs text-brand-muted">JPG, PNG, or WebP. Recommended 16:9 ratio.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-brand-dark">Title</label>
          <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
            placeholder="e.g., Catholic Social Media Ministry 101" />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-brand-dark">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none">
            <option value="course">Course</option>
            <option value="event">Event</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-dark">Description</label>
        <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none resize-y"
          placeholder="Describe what students will learn..." />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="pricing" className="block text-sm font-medium text-brand-dark">Pricing</label>
          <select id="pricing" value={parseFloat(price) === 0 ? "free" : "paid"}
            onChange={(e) => setPrice(e.target.value === "free" ? "0" : price === "0" ? "500" : price)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none">
            <option value="paid">Paid</option>
            <option value="free">Free</option>
          </select>
        </div>
        {parseFloat(price) !== 0 && (
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-brand-dark">Price (₱)</label>
            <input id="price" type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none" />
          </div>
        )}

        <div className="flex items-end pb-1">
          <div className="flex items-center gap-3">
            <button type="button" role="switch" aria-checked={isPublished} onClick={() => setIsPublished(!isPublished)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${isPublished ? "bg-brand-green" : "bg-gray-300"}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform mt-0.5 ${isPublished ? "translate-x-5.5 ml-px" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm font-medium text-brand-dark">{isPublished ? "Published" : "Draft"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
          {loading ? "Saving..." : course ? "Save Changes" : "Create Course"}
        </button>
        <Link href="/admin" className="min-h-11 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-brand-dark hover:bg-gray-50 transition-colors inline-flex items-center">
          Cancel
        </Link>
      </div>
    </form>
  );
}
