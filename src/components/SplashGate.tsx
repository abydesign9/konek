"use client";

import { useEffect, useState } from "react";

// A brief, branded splash shown on a cold launch (a full page load). It fades
// out on its own, so the app opens on a Konek screen instead of a flash of
// unstyled content. Shown once per launch: in-app (SPA) navigations don't
// retrigger it, but a real relaunch of the installed app does. This gives a
// consistent splash on both Android and iOS, where iOS ignores the manifest
// splash entirely.
export function SplashGate() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only once per launch. sessionStorage clears when the app is fully closed.
    if (sessionStorage.getItem("konek_splash_shown")) return;
    sessionStorage.setItem("konek_splash_shown", "1");
    setVisible(true);
    const fade = setTimeout(() => setLeaving(true), 750);
    const hide = setTimeout(() => setVisible(false), 1050);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#1F3864" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-512.png" alt="Konek" className="h-24 w-24 rounded-3xl shadow-lg" />
      <p className="mt-4 font-heading text-2xl font-bold tracking-wide text-white">Konek</p>
      <div className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-white/70" />
      </div>
    </div>
  );
}
