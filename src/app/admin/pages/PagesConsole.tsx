"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/adminUi";

interface Section {
  label: string;
  heading: string;
  body: string;
}
interface Page {
  slug: string;
  title: string;
  subtitle: string | null;
  sections: Section[];
  published: boolean;
}

const SLUG = "about";

export function PagesConsole() {
  const [page, setPage] = useState<Page | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/content-pages/${SLUG}`)
      .then((r) => r.json())
      .then((d) => setPage(d.page ?? null));
  }, []);

  function edit(patch: Partial<Page>) {
    setPage((p) => (p ? { ...p, ...patch } : p));
  }
  function editSection(i: number, patch: Partial<Section>) {
    setPage((p) => (p ? { ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : p));
  }
  function addSection() {
    setPage((p) => (p ? { ...p, sections: [...p.sections, { label: "", heading: "", body: "" }] } : p));
  }
  function removeSection(i: number) {
    setPage((p) => (p ? { ...p, sections: p.sections.filter((_, j) => j !== i) } : p));
  }
  function move(i: number, dir: -1 | 1) {
    setPage((p) => {
      if (!p) return p;
      const j = i + dir;
      if (j < 0 || j >= p.sections.length) return p;
      const s = [...p.sections];
      [s[i], s[j]] = [s[j], s[i]];
      return { ...p, sections: s };
    });
  }

  async function save() {
    if (!page) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/content-pages/${SLUG}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: page.title, subtitle: page.subtitle, sections: page.sections, published: page.published }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved. The public page is updated." : "Save failed.");
  }

  if (!page) return null;

  return (
    <>
      <PageHeader
        title="Public pages"
        description="Edit the public About page shown on your website at /about. Changes go live as soon as you save. Section text is plain: start a line with '- ' for a bullet, leave a blank line to start a new paragraph."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-konek-green">{msg}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-lg bg-indigo px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={page.published} onChange={(e) => edit({ published: e.target.checked })} />
          Published
        </label>
        <a href="/about" target="_blank" rel="noreferrer" className="text-sm font-semibold text-konek-green">
          View live page ↗
        </a>
      </div>

      <Card title="Header" className="mb-5">
        <label className="block text-xs text-text-secondary">
          Title
          <textarea value={page.title} onChange={(e) => edit({ title: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
        </label>
        <label className="mt-3 block text-xs text-text-secondary">
          Subtitle
          <textarea value={page.subtitle ?? ""} onChange={(e) => edit({ subtitle: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
        </label>
      </Card>

      <div className="space-y-4">
        {page.sections.map((s, i) => (
          <Card
            key={i}
            title={`Section ${i + 1}`}
            action={
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => move(i, -1)} className="text-text-secondary" title="Move up">↑</button>
                <button onClick={() => move(i, 1)} className="text-text-secondary" title="Move down">↓</button>
                <button onClick={() => removeSection(i)} className="font-semibold text-red-600">Remove</button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-text-secondary">
                Label (eyebrow)
                <input value={s.label} onChange={(e) => editSection(i, { label: e.target.value })} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
              </label>
              <label className="text-xs text-text-secondary">
                Heading
                <input value={s.heading} onChange={(e) => editSection(i, { heading: e.target.value })} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="mt-3 block text-xs text-text-secondary">
              Body
              <textarea value={s.body} onChange={(e) => editSection(i, { body: e.target.value })} rows={6} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
            </label>
          </Card>
        ))}
      </div>

      <button onClick={addSection} className="mt-4 rounded-lg border border-dashed border-indigo/30 px-4 py-2.5 text-sm font-semibold text-indigo">
        + Add section
      </button>
    </>
  );
}
