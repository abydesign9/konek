"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Custom "install this app" banner, since browsers' own install prompts are
// subtle, inconsistent, and Safari doesn't have one at all.
//
//   - Chrome/Edge/Android (anything supporting `beforeinstallprompt`): we
//     capture that event ourselves so we control when/how the prompt is
//     offered, then trigger the real native install dialog on tap.
//   - iOS Safari: there is no programmatic install API — Apple only allows
//     the manual Share -> "Add to Home Screen" path. We show instructions
//     instead of a button.
//   - Any browser that supports neither (desktop Firefox, in-app browsers
//     like Instagram/Facebook webviews, etc.): render nothing. We can't
//     reliably install there, and a banner with no working action is worse
//     than no banner.
//
// Dismissal is remembered in localStorage for 14 days so this doesn't nag
// on every visit; installing (or already being installed) hides it for good.

const DISMISS_KEY = "raviion_install_dismissed_at";
const DISMISS_DAYS = 14;

type Platform = "android" | "ios" | "unsupported";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for "launched from home screen"
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOS && isSafari) return "ios";
  // Android Chrome/Edge/Samsung Internet etc. all support beforeinstallprompt;
  // we still gate the actual banner on that event actually firing below.
  if (/Android/.test(ua)) return "android";
  return "unsupported";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — never show

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const dismissedRecently = dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return;

    const detected = detectPlatform();
    setPlatform(detected);

    if (detected === "ios") {
      setVisible(true);
      return;
    }

    // Android/desktop Chrome: wait for the real event before showing anything
    // — if it never fires (criteria not met, or unsupported browser), we
    // simply never show a banner rather than offering a broken button.
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      // Either way the browser's own dialog was resolved — don't show ours again.
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
    setDeferredEvent(null);
  }

  if (!visible || !platform || platform === "unsupported") return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-indigo px-4 py-3.5 text-white shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
        </div>

        {platform === "android" && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Install raviion</p>
              <p className="text-xs leading-tight text-white/70">Faster access, right from your home screen</p>
            </div>
            <button
              onClick={handleInstall}
              className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo"
            >
              Install
            </button>
          </>
        )}

        {platform === "ios" && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Install raviion</p>
            <p className="text-xs leading-tight text-white/70">
              Tap <span className="font-semibold">Share</span>, then{" "}
              <span className="font-semibold">Add to Home Screen</span>
            </p>
          </div>
        )}

        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-white/60">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
