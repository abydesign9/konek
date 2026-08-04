"use client";

import { useEffect, useState } from "react";

interface TourStep {
  id: string;
  step_order: number;
  icon: string;
  title: string;
  body: string;
  status: string;
}

export function OnboardingConsole() {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stepOrder, setStepOrder] = useState("1");
  const [icon, setIcon] = useState("✨");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("active");

  function load() {
    fetch("/api/admin/onboarding-steps")
      .then((r) => r.json())
      .then((d) => setSteps(d.steps ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setStepOrder(String(steps.length + 1));
    setIcon("✨");
    setTitle("");
    setBody("");
    setStatus("active");
    setShowForm(false);
  }

  function editStep(s: TourStep) {
    setEditingId(s.id);
    setStepOrder(String(s.step_order));
    setIcon(s.icon);
    setTitle(s.title);
    setBody(s.body);
    setStatus(s.status);
    setShowForm(true);
  }

  async function saveStep() {
    if (!title.trim() || !body.trim()) {
      setMessage("Title and body are required");
      return;
    }
    const payload = { stepOrder: Number(stepOrder), icon, title, body, status };
    const res = editingId
      ? await fetch(`/api/admin/onboarding-steps/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/onboarding-steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "Could not save step");
      return;
    }
    setMessage(editingId ? "Step updated" : "Step created");
    resetForm();
    load();
  }

  async function toggleStatus(s: TourStep) {
    const next = s.status === "active" ? "inactive" : "active";
    await fetch(`/api/admin/onboarding-steps/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function deleteStep(id: string) {
    if (!confirm("Delete this step?")) return;
    await fetch(`/api/admin/onboarding-steps/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-indigo">Onboarding tour</h1>
          <p className="mt-1 text-sm text-text-secondary">
            The steps shown after &quot;Welcome to Konek&quot; on a user&apos;s first visit to Home. Order, edit or
            retire steps without a release.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-indigo/90"
        >
          Add step
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border-soft bg-hover-tint px-4 py-2 text-sm text-indigo">{message}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-2xl border border-border-soft p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Order</label>
              <input
                type="number"
                value={stepOrder}
                onChange={(e) => setStepOrder(e.target.value)}
                className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Icon (emoji)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-text-secondary">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One platform, not six apps"
              className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-text-secondary">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="What this screen tells the user"
              className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveStep} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white">
              {editingId ? "Save changes" : "Create step"}
            </button>
            <button onClick={resetForm} className="rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold text-indigo">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {steps.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center text-sm text-text-secondary">
            No tour steps yet.
          </p>
        )}
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-white px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hover-tint text-xs font-bold text-indigo">
              {s.step_order}
            </span>
            <span className="text-xl">{s.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-indigo">{s.title}</p>
              <p className="truncate text-xs text-text-secondary">{s.body}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                s.status === "active"
                  ? "bg-konek-green/15 text-konek-green"
                  : s.status === "draft"
                    ? "bg-gold/15 text-gold"
                    : "bg-text-secondary/10 text-text-secondary"
              }`}
            >
              {s.status}
            </span>
            <button onClick={() => toggleStatus(s)} className="shrink-0 text-xs font-semibold text-indigo hover:underline">
              {s.status === "active" ? "Deactivate" : "Activate"}
            </button>
            <button onClick={() => editStep(s)} className="shrink-0 text-xs font-semibold text-indigo hover:underline">
              Edit
            </button>
            <button onClick={() => deleteStep(s.id)} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
