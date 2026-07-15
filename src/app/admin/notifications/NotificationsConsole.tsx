"use client";

import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  body: string;
  category: string | null;
  channels: string[];
  audience: string;
  schedule_type: string;
  scheduled_at: string | null;
  recurring_interval_hours: number | null;
  timezone: string;
  status: string;
  created_at: string;
  last_sent_at: string | null;
}

interface Analytics {
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  openRatePct: number;
  clickRatePct: number;
  convertedPct: number;
}

interface InAppMessage {
  id: string;
  title: string;
  type: string;
  message: string;
  url: string | null;
  dimension: string;
  display_duration_seconds: number;
  active: boolean;
  closable: boolean;
  status: string;
  created_at: string;
}

const SECTIONS = [
  { id: "campaigns", label: "Campaigns" },
  { id: "templates", label: "Templates" },
  { id: "in_app", label: "In-App Messages" },
];

const AUDIENCES = [
  { id: "all", label: "All Users" },
  { id: "tier1", label: "Tier 1 Users" },
  { id: "tier2", label: "Tier 2 Users" },
  { id: "business", label: "Businesses" },
  { id: "agent", label: "Agents" },
  { id: "diaspora", label: "Diaspora" },
  { id: "new_users", label: "New Users" },
  { id: "custom", label: "Custom Segment" },
];

const CHANNEL_OPTIONS = ["push", "in_app", "email"];

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-indigo/10 text-indigo/60",
  scheduled: "bg-gold/15 text-gold",
  active: "bg-konek-green/15 text-konek-green",
  sent: "bg-konek-green/15 text-konek-green",
  inactive: "bg-indigo/10 text-indigo/50",
};

export function NotificationsConsole() {
  const [section, setSection] = useState("campaigns");

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tName, setTName] = useState("");
  const [tSubject, setTSubject] = useState("");
  const [tBody, setTBody] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cSubject, setCSubject] = useState("");
  const [cBody, setCBody] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [cChannels, setCChannels] = useState<string[]>(["push"]);
  const [cAudience, setCAudience] = useState("all");
  const [cAudiencePhones, setCAudiencePhones] = useState("");
  const [cScheduleType, setCScheduleType] = useState("immediate");
  const [cScheduledAt, setCScheduledAt] = useState("");
  const [cRecurringHours, setCRecurringHours] = useState("24");
  const [cTimezone, setCTimezone] = useState("Africa/Lagos");
  const [audiencePreview, setAudiencePreview] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // In-app messages
  const [inAppMessages, setInAppMessages] = useState<InAppMessage[]>([]);
  const [showInAppForm, setShowInAppForm] = useState(false);
  const [iTitle, setITitle] = useState("");
  const [iType, setIType] = useState("image");
  const [iMessage, setIMessage] = useState("");
  const [iUrl, setIUrl] = useState("");
  const [iDimension, setIDimension] = useState("medium");
  const [iDuration, setIDuration] = useState("5");
  const [iActive, setIActive] = useState(true);
  const [iClosable, setIClosable] = useState(true);

  function loadTemplates() {
    fetch("/api/admin/notifications/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? []));
  }
  function loadCampaigns() {
    fetch("/api/admin/notifications/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
  }
  function loadInAppMessages() {
    fetch("/api/admin/in-app-messages").then((r) => r.json()).then((d) => setInAppMessages(d.messages ?? []));
  }

  useEffect(() => {
    loadTemplates();
    loadCampaigns();
    loadInAppMessages();
  }, []);

  useEffect(() => {
    if (cAudience !== "custom") {
      fetch("/api/admin/notifications/campaigns/audience-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: cAudience }),
      })
        .then((r) => r.json())
        .then((d) => setAudiencePreview(d.size ?? null));
    } else {
      const phones = cAudiencePhones.split(",").map((p) => p.trim()).filter(Boolean);
      setAudiencePreview(phones.length);
    }
  }, [cAudience, cAudiencePhones]);

  // ---- Templates ----
  async function saveTemplate() {
    if (!tName.trim() || !tSubject.trim() || !tBody.trim()) return;
    if (editingTemplate) {
      await fetch(`/api/admin/notifications/templates/${editingTemplate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tName, subject: tSubject, body: tBody }),
      });
    } else {
      await fetch("/api/admin/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tName, subject: tSubject, body: tBody }),
      });
    }
    setTName("");
    setTSubject("");
    setTBody("");
    setEditingTemplate(null);
    loadTemplates();
  }
  function editTemplate(t: Template) {
    setEditingTemplate(t.id);
    setTName(t.name);
    setTSubject(t.subject);
    setTBody(t.body);
  }
  async function deleteTemplateRow(id: string) {
    await fetch(`/api/admin/notifications/templates/${id}`, { method: "DELETE" });
    loadTemplates();
  }
  function useTemplateForCampaign(t: Template) {
    setSection("campaigns");
    setShowCampaignForm(true);
    setCSubject(t.subject);
    setCBody(t.body);
    if (!cTitle) setCTitle(t.name);
  }

  // ---- Campaigns ----
  function toggleChannel(c: string) {
    setCChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }
  async function createCampaign() {
    if (!cTitle.trim() || !cSubject.trim() || !cBody.trim()) {
      setMessage("Title, subject and body are required");
      return;
    }
    const res = await fetch("/api/admin/notifications/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: cTitle,
        description: cDescription || undefined,
        subject: cSubject,
        body: cBody,
        category: cCategory || undefined,
        channels: cChannels,
        audience: cAudience,
        audiencePhones: cAudience === "custom" ? cAudiencePhones.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
        scheduleType: cScheduleType,
        scheduledAt: cScheduleType !== "immediate" ? cScheduledAt : undefined,
        recurringIntervalHours: cScheduleType === "recurring" ? Number(cRecurringHours) : undefined,
        timezone: cTimezone,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Failed to create campaign");
      return;
    }
    setMessage(cScheduleType === "immediate" ? "Draft created — click Send to deliver" : "Campaign scheduled (config saved; manual send still required — no dispatch worker yet)");
    setCTitle("");
    setCDescription("");
    setCSubject("");
    setCBody("");
    setCCategory("");
    setShowCampaignForm(false);
    loadCampaigns();
  }
  async function sendCampaign(id: string) {
    const res = await fetch(`/api/admin/notifications/campaigns/${id}/send`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Sent to ${body.recipients} recipients` : body.error ?? "Failed to send");
    loadCampaigns();
    if (selectedCampaign === id) loadAnalytics(id);
  }
  async function toggleCampaignStatus(c: Campaign) {
    const next = c.status === "inactive" ? "scheduled" : "inactive";
    await fetch(`/api/admin/notifications/campaigns/${c.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    loadCampaigns();
  }
  async function deleteCampaignRow(id: string) {
    const res = await fetch(`/api/admin/notifications/campaigns/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(body.error ?? "Failed to delete");
    loadCampaigns();
  }
  function loadAnalytics(id: string) {
    setSelectedCampaign(id);
    fetch(`/api/admin/notifications/campaigns/${id}/analytics`).then((r) => r.json()).then(setAnalytics);
  }

  // ---- In-app messages ----
  async function createInAppMessage() {
    if (!iTitle.trim() || !iMessage.trim()) return;
    await fetch("/api/admin/in-app-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: iTitle,
        type: iType,
        message: iMessage,
        url: iUrl || undefined,
        dimension: iDimension,
        displayDurationSeconds: Number(iDuration),
        active: iActive,
        closable: iClosable,
        status: "active",
      }),
    });
    setITitle("");
    setIMessage("");
    setIUrl("");
    setShowInAppForm(false);
    loadInAppMessages();
  }
  async function toggleInAppStatus(m: InAppMessage) {
    await fetch(`/api/admin/in-app-messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: m.status === "active" ? "inactive" : "active" }),
    });
    loadInAppMessages();
  }
  async function deleteInAppMessageRow(id: string) {
    await fetch(`/api/admin/in-app-messages/${id}`, { method: "DELETE" });
    loadInAppMessages();
  }

  return (
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Notification center</h1>
      <p className="text-sm text-indigo/60 mb-6">Campaigns, templates, and in-app messages — one place, no engineering needed to update copy.</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
              section === s.id ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {message && <p className="text-xs text-indigo/60 mb-4">{message}</p>}

      {section === "campaigns" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-indigo">Campaigns</p>
            <button onClick={() => setShowCampaignForm((s) => !s)} className="text-xs font-semibold text-konek-green">
              {showCampaignForm ? "Cancel" : "Create Notification"}
            </button>
          </div>

          {showCampaignForm && (
            <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-6">
              <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Campaign title" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <input value={cDescription} onChange={(e) => setCDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="Notification subject/title" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <textarea value={cBody} onChange={(e) => setCBody(e.target.value)} placeholder="Message body" rows={3} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <input value={cCategory} onChange={(e) => setCCategory(e.target.value)} placeholder="Category (optional)" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-3" />

              {templates.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-indigo/50 mb-1">Or start from a template</p>
                  <div className="flex gap-2 flex-wrap">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => { setCSubject(t.subject); setCBody(t.body); }} className="rounded-full bg-indigo/10 text-indigo text-xs px-3 py-1">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs font-semibold text-indigo/60 mb-1.5">Channels</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {CHANNEL_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChannel(c)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${cChannels.includes(c) ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold text-indigo/60 mb-1.5">Audience</p>
              <select value={cAudience} onChange={(e) => setCAudience(e.target.value)} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2">
                {AUDIENCES.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              {cAudience === "custom" && (
                <input
                  value={cAudiencePhones}
                  onChange={(e) => setCAudiencePhones(e.target.value)}
                  placeholder="+2348..., +2349..."
                  className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2"
                />
              )}
              {audiencePreview !== null && (
                <p className="text-xs text-konek-green mb-3">~{audiencePreview} recipients</p>
              )}

              <p className="text-xs font-semibold text-indigo/60 mb-1.5">Scheduling</p>
              <select value={cScheduleType} onChange={(e) => setCScheduleType(e.target.value)} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2">
                <option value="immediate">Send Immediately</option>
                <option value="scheduled">Schedule Date &amp; Time</option>
                <option value="recurring">Recurring</option>
              </select>
              {cScheduleType !== "immediate" && (
                <div className="flex gap-2 mb-2">
                  <input type="datetime-local" value={cScheduledAt} onChange={(e) => setCScheduledAt(e.target.value)} className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm" />
                  <select value={cTimezone} onChange={(e) => setCTimezone(e.target.value)} className="rounded-lg border border-indigo/20 px-2 py-2 text-sm">
                    <option value="Africa/Lagos">Africa/Lagos</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              )}
              {cScheduleType === "recurring" && (
                <input
                  type="number"
                  value={cRecurringHours}
                  onChange={(e) => setCRecurringHours(e.target.value)}
                  placeholder="Repeat every N hours"
                  className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2"
                />
              )}
              {cScheduleType !== "immediate" && (
                <p className="text-[11px] text-gold mb-2">
                  Saved as configuration — dispatch still requires a manual &ldquo;Send&rdquo; until a scheduler worker exists.
                </p>
              )}

              <button onClick={createCampaign} className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2 mt-1">
                Save campaign
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-8">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-indigo truncate">{c.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[c.status] ?? ""}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-indigo/50 mb-2">
                  {AUDIENCES.find((a) => a.id === c.audience)?.label ?? c.audience} · {c.channels.join(", ")} ·{" "}
                  {c.schedule_type}
                  {c.last_sent_at && ` · last sent ${new Date(c.last_sent_at).toLocaleString()}`}
                </p>
                <div className="flex gap-3 flex-wrap">
                  {c.status !== "sent" && (
                    <button onClick={() => sendCampaign(c.id)} className="text-xs font-semibold text-konek-green underline">
                      Send now
                    </button>
                  )}
                  {c.status === "sent" && (
                    <button onClick={() => loadAnalytics(c.id)} className="text-xs font-semibold text-indigo underline">
                      View analytics
                    </button>
                  )}
                  {(c.schedule_type !== "immediate") && c.status !== "sent" && (
                    <button onClick={() => toggleCampaignStatus(c)} className="text-xs font-semibold text-indigo underline">
                      {c.status === "inactive" ? "Enable" : "Disable"}
                    </button>
                  )}
                  {c.status !== "sent" && (
                    <button onClick={() => deleteCampaignRow(c.id)} className="text-xs font-semibold text-red-600 underline">
                      Delete
                    </button>
                  )}
                </div>
                {selectedCampaign === c.id && analytics && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="rounded-lg bg-indigo/5 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-indigo/50">Delivered</p>
                      <p className="text-sm font-bold text-indigo">{analytics.delivered}</p>
                    </div>
                    <div className="rounded-lg bg-indigo/5 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-indigo/50">Open rate</p>
                      <p className="text-sm font-bold text-indigo">{analytics.openRatePct}%</p>
                    </div>
                    <div className="rounded-lg bg-indigo/5 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-indigo/50">Click rate</p>
                      <p className="text-sm font-bold text-indigo">{analytics.clickRatePct}%</p>
                    </div>
                    <div className="rounded-lg bg-indigo/5 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-indigo/50">Failed</p>
                      <p className="text-sm font-bold text-indigo">0</p>
                    </div>
                    <div className="rounded-lg bg-konek-green/10 px-2 py-1.5 text-center col-span-2">
                      <p className="text-[10px] text-indigo/50">Converted (purchase within 48h)</p>
                      <p className="text-sm font-bold text-konek-green">{analytics.converted} ({analytics.convertedPct}%)</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {campaigns.length === 0 && <p className="text-sm text-indigo/50">No campaigns yet.</p>}
          </div>
        </>
      )}

      {section === "templates" && (
        <>
          <p className="text-sm font-semibold text-indigo mb-3">{editingTemplate ? "Edit template" : "New template"}</p>
          <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-6">
            <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Template name" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
            <input value={tSubject} onChange={(e) => setTSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
            <textarea value={tBody} onChange={(e) => setTBody(e.target.value)} placeholder="Message preview" rows={3} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2">
                {editingTemplate ? "Save changes" : "Create template"}
              </button>
              {editingTemplate && (
                <button onClick={() => { setEditingTemplate(null); setTName(""); setTSubject(""); setTBody(""); }} className="text-xs text-indigo/50 underline">
                  Cancel
                </button>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-indigo mb-3">All templates</p>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <p className="text-sm font-medium text-indigo">{t.name}</p>
                <p className="text-xs text-indigo/50 mb-2">{t.subject}</p>
                <div className="flex gap-3">
                  <button onClick={() => useTemplateForCampaign(t)} className="text-xs font-semibold text-konek-green underline">
                    Use in campaign
                  </button>
                  <button onClick={() => editTemplate(t)} className="text-xs font-semibold text-indigo underline">
                    Edit
                  </button>
                  <button onClick={() => deleteTemplateRow(t.id)} className="text-xs font-semibold text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-indigo/50">No templates yet.</p>}
          </div>
        </>
      )}

      {section === "in_app" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-indigo">In-app messages</p>
            <button onClick={() => setShowInAppForm((s) => !s)} className="text-xs font-semibold text-konek-green">
              {showInAppForm ? "Cancel" : "New in app message"}
            </button>
          </div>

          {showInAppForm && (
            <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-6">
              <p className="text-xs font-semibold text-indigo/60 mb-1.5">Type of message</p>
              <select value={iType} onChange={(e) => setIType(e.target.value)} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2">
                <option value="image">Image — display a banner image to target customers</option>
                <option value="video">Video — display a short video clip to target customers</option>
                <option value="survey">Survey — redirect customers to a survey link</option>
              </select>
              <input value={iTitle} onChange={(e) => setITitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <textarea value={iMessage} onChange={(e) => setIMessage(e.target.value)} placeholder="Message" rows={2} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <input value={iUrl} onChange={(e) => setIUrl(e.target.value)} placeholder="URL" className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2" />
              <div className="flex gap-2 mb-2">
                <select value={iDimension} onChange={(e) => setIDimension(e.target.value)} className="flex-1 rounded-lg border border-indigo/20 px-2 py-2 text-sm">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
                <input
                  type="number"
                  value={iDuration}
                  onChange={(e) => setIDuration(e.target.value)}
                  placeholder="Display duration (s)"
                  className="w-32 rounded-lg border border-indigo/20 px-2 py-2 text-sm"
                />
              </div>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-1.5 text-sm text-indigo">
                  <input type="checkbox" checked={iActive} onChange={(e) => setIActive(e.target.checked)} /> Active
                </label>
                <label className="flex items-center gap-1.5 text-sm text-indigo">
                  <input type="checkbox" checked={iClosable} onChange={(e) => setIClosable(e.target.checked)} /> Closable
                </label>
              </div>

              <p className="text-xs font-semibold text-indigo/60 mb-1.5">Preview</p>
              <div className={`rounded-xl border border-indigo/10 bg-indigo/5 p-3 mb-3 ${iDimension === "small" ? "max-w-[200px]" : iDimension === "large" ? "w-full" : "max-w-[320px]"}`}>
                <p className="text-sm font-semibold text-indigo">{iTitle || "Title"}</p>
                <p className="text-xs text-indigo/60">{iMessage || "Message preview"}</p>
              </div>

              <button onClick={createInAppMessage} className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2">
                Save changes
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {inAppMessages.map((m) => (
              <div key={m.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-indigo truncate">{m.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[m.status] ?? ""}`}>
                    {m.status}
                  </span>
                </div>
                <p className="text-xs text-indigo/50 mb-2">
                  {m.type} · {m.dimension} · {new Date(m.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => toggleInAppStatus(m)} className="text-xs font-semibold text-indigo underline">
                    {m.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteInAppMessageRow(m.id)} className="text-xs font-semibold text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {inAppMessages.length === 0 && <p className="text-sm text-indigo/50">No in-app messages yet.</p>}
          </div>
        </>
      )}
    </>
  );
}
