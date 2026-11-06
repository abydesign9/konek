"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { IconChevronRight } from "@/components/icons";
import { PushToggle } from "@/components/PushToggle";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match device" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pcm", label: "Pidgin" },
];

export function PreferencesClient() {
  const [theme, setTheme] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [saving, setSaving] = useState<"theme" | "language" | null>(null);

  useEffect(() => {
    fetch("/api/settings/me")
      .then((r) => r.json())
      .then((d) => {
        setTheme(d.theme ?? "system");
        setLanguage(d.language ?? "en");
      });
  }, []);

  async function updateTheme(next: string) {
    setTheme(next);
    setSaving("theme");
    await fetch("/api/settings/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
    setSaving(null);
  }

  async function updateLanguage(next: string) {
    setLanguage(next);
    setSaving("language");
    await fetch("/api/settings/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    });
    setSaving(null);
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Preferences" backHref="/profile" />

      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Notifications</p>
          <div className="mb-2.5">
            <PushToggle />
          </div>
          <Link
            href="/notifications"
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 raviion-card-shadow raviion-tile"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-indigo">Notification preferences</span>
              <span className="block text-xs text-indigo/55">Push, SMS and WhatsApp channels</span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
          </Link>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Appearance</p>
          <div className="raviion-card-shadow rounded-2xl bg-white px-4 py-3.5">
            <p className="mb-2 text-sm font-semibold text-indigo">Theme</p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateTheme(t.value)}
                  disabled={saving === "theme"}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    theme === t.value ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-indigo/45">
              Your choice is saved, but dark and match-device don&apos;t change how the app looks yet — we
              tried this and it made text unreadable in places, so it&apos;s off while we do it properly.
            </p>
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Language</p>
          <div className="raviion-card-shadow rounded-2xl bg-white px-4 py-3.5">
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => updateLanguage(l.value)}
                  disabled={saving === "language"}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    language === l.value ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-indigo/45">
              Your choice is saved. Translated app copy is coming soon — everything still displays in English today.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
