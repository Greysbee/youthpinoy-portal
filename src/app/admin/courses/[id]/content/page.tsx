"use client";

import AdminShell from "@/components/admin-shell";
import { createClient } from "@/lib/supabase-client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

type Section = { id: string; course_id: string; title: string; order_index: number };
type Topic = { id: string; course_id: string; section_id: string | null; title: string; description: string | null; vimeo_url: string | null; vimeo_id: string | null; order_index: number };

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [addingTopicTo, setAddingTopicTo] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({ title: "", description: "", vimeoUrl: "" });
  const [editingTopic, setEditingTopic] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
      setCourseTitle(course?.title ?? "");
      const { data: sectionData } = await supabase.from("sections").select("*").eq("course_id", id).order("order_index");
      setSections(sectionData ?? []);
      const { data: topicData } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_index");
      setTopics(topicData ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function parseVimeoId(url: string): string {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match?.[1] ?? "";
  }

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("sections").insert({
      course_id: id, title: newSectionTitle.trim(), order_index: sections.length,
    }).select().single();
    if (error) { alert(error.message); return; }
    if (data) setSections([...sections, data]);
    setNewSectionTitle("");
  }

  async function updateSection(sectionId: string) {
    if (!editSectionTitle.trim()) return;
    const supabase = createClient();
    await supabase.from("sections").update({ title: editSectionTitle.trim() }).eq("id", sectionId);
    setSections(sections.map((s) => s.id === sectionId ? { ...s, title: editSectionTitle.trim() } : s));
    setEditingSection(null);
  }

  async function deleteSection(sectionId: string) {
    if (!confirm("Delete this section and all its topics?")) return;
    const supabase = createClient();
    await supabase.from("lessons").delete().eq("section_id", sectionId);
    await supabase.from("sections").delete().eq("id", sectionId);
    setSections(sections.filter((s) => s.id !== sectionId));
    setTopics(topics.filter((t) => t.section_id !== sectionId));
  }

  async function addTopic(sectionId: string) {
    if (!topicForm.title.trim()) return;
    const supabase = createClient();
    const sectionTopics = topics.filter((t) => t.section_id === sectionId);
    const { data, error } = await supabase.from("lessons").insert({
      course_id: id,
      section_id: sectionId,
      title: topicForm.title.trim(),
      description: topicForm.description || null,
      vimeo_url: topicForm.vimeoUrl || null,
      vimeo_id: parseVimeoId(topicForm.vimeoUrl) || null,
      order_index: sectionTopics.length,
    }).select().single();
    if (error) { alert(error.message); return; }
    if (data) setTopics([...topics, data]);
    setTopicForm({ title: "", description: "", vimeoUrl: "" });
    setAddingTopicTo(null);
  }

  async function updateTopic(topicId: string) {
    const supabase = createClient();
    await supabase.from("lessons").update({
      title: topicForm.title.trim(),
      description: topicForm.description || null,
      vimeo_url: topicForm.vimeoUrl || null,
      vimeo_id: parseVimeoId(topicForm.vimeoUrl) || null,
    }).eq("id", topicId);
    setTopics(topics.map((t) => t.id === topicId ? {
      ...t,
      title: topicForm.title.trim(),
      description: topicForm.description || null,
      vimeo_url: topicForm.vimeoUrl || null,
      vimeo_id: parseVimeoId(topicForm.vimeoUrl) || null,
    } : t));
    setEditingTopic(null);
    setTopicForm({ title: "", description: "", vimeoUrl: "" });
  }

  async function deleteTopic(topicId: string) {
    if (!confirm("Delete this topic?")) return;
    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", topicId);
    setTopics(topics.filter((t) => t.id !== topicId));
  }

  if (loading) return <AdminShell><p className="text-brand-muted">Loading...</p></AdminShell>;

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark mb-4">
        ← Back to courses
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Course Content</h1>
          <p className="mt-1 text-brand-muted">{courseTitle}</p>
        </div>
      </div>

      {/* Add Section */}
      <div className="mt-6 flex gap-2">
        <input
          type="text"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder="New section title..."
          onKeyDown={(e) => e.key === "Enter" && addSection()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
        />
        <button onClick={addSection}
          className="min-h-11 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 transition-colors whitespace-nowrap">
          + Add Section
        </button>
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-brand-muted">No sections yet. Add your first section above.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {sections.sort((a, b) => a.order_index - b.order_index).map((section, si) => {
            const sectionTopics = topics.filter((t) => t.section_id === section.id).sort((a, b) => a.order_index - b.order_index);

            return (
              <div key={section.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                    {si + 1}
                  </span>
                  {editingSection === section.id ? (
                    <div className="flex flex-1 gap-2">
                      <input type="text" value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && updateSection(section.id)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-accent" />
                      <button onClick={() => updateSection(section.id)} className="text-sm text-brand-accent hover:underline">Save</button>
                      <button onClick={() => setEditingSection(null)} className="text-sm text-brand-muted hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <h3 className="flex-1 font-semibold text-brand-dark">{section.title}</h3>
                      <span className="text-xs text-brand-muted">{sectionTopics.length} topic{sectionTopics.length !== 1 ? "s" : ""}</span>
                      <button onClick={() => { setEditingSection(section.id); setEditSectionTitle(section.title); }}
                        className="text-sm text-brand-accent hover:underline">Edit</button>
                      <button onClick={() => deleteSection(section.id)}
                        className="text-sm text-brand-red hover:underline">Delete</button>
                    </>
                  )}
                </div>

                {/* Topics list */}
                <div className="divide-y divide-gray-100">
                  {sectionTopics.map((topic, ti) => (
                    <div key={topic.id}>
                      {editingTopic === topic.id ? (
                        <div className="p-4 bg-brand-accent/5 space-y-3">
                          <input type="text" value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                            placeholder="Topic title" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent" />
                          <textarea rows={2} value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                            placeholder="Description (optional)" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent resize-y" />
                          <input type="url" value={topicForm.vimeoUrl} onChange={(e) => setTopicForm({ ...topicForm, vimeoUrl: e.target.value })}
                            placeholder="Vimeo URL (optional)" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent" />
                          {topicForm.vimeoUrl && parseVimeoId(topicForm.vimeoUrl) && <p className="text-xs text-brand-muted">Vimeo ID: {parseVimeoId(topicForm.vimeoUrl)}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => updateTopic(topic.id)} className="rounded-lg bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">Update</button>
                            <button onClick={() => { setEditingTopic(null); setTopicForm({ title: "", description: "", vimeoUrl: "" }); }} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-brand-dark hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-blue/10 text-xs font-bold text-brand-blue">
                            {ti + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-dark truncate">{topic.title}</p>
                            {topic.vimeo_url && <p className="text-xs text-brand-muted truncate">{topic.vimeo_url}</p>}
                          </div>
                          <button onClick={() => { setEditingTopic(topic.id); setTopicForm({ title: topic.title, description: topic.description ?? "", vimeoUrl: topic.vimeo_url ?? "" }); }}
                            className="text-sm text-brand-accent hover:underline shrink-0">Edit</button>
                          <button onClick={() => deleteTopic(topic.id)}
                            className="text-sm text-brand-red hover:underline shrink-0">Delete</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add topic form */}
                  {addingTopicTo === section.id ? (
                    <div className="p-4 bg-brand-accent/5 space-y-3">
                      <input type="text" value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                        placeholder="Topic title" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent" />
                      <textarea rows={2} value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                        placeholder="Description (optional)" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent resize-y" />
                      <input type="url" value={topicForm.vimeoUrl} onChange={(e) => setTopicForm({ ...topicForm, vimeoUrl: e.target.value })}
                        placeholder="Vimeo URL (optional)" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent" />
                      {topicForm.vimeoUrl && parseVimeoId(topicForm.vimeoUrl) && <p className="text-xs text-brand-muted">Vimeo ID: {parseVimeoId(topicForm.vimeoUrl)}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => addTopic(section.id)} className="rounded-lg bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">Add Topic</button>
                        <button onClick={() => { setAddingTopicTo(null); setTopicForm({ title: "", description: "", vimeoUrl: "" }); }} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-brand-dark hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTopicTo(section.id); setTopicForm({ title: "", description: "", vimeoUrl: "" }); }}
                      className="w-full px-4 py-3 text-left text-sm text-brand-accent hover:bg-gray-50 transition-colors">
                      + Add Topic
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
