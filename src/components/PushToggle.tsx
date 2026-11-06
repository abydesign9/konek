"use client";

import { useEffect, useState } from "react";
import { currentSubscription, disablePush, enablePush, pushSupported } from "@/lib/push/client";

// Enable/disable Web Push on this device. Reflects the current browser
// permission + subscription, and explains the iOS caveat (push only works once
// the app is installed to the Home Screen on iOS 16.4+).
export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (ok) currentSubscription().then((s) => setOn(!!s));

    const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isIos && !ok && !standalone) setIosNeedsInstall(true);
  }, []);

  async function toggle() {
    setBusy(true);
    setMsg(null);
    if (on) {
      await disablePush();
      setOn(false);
    } else {
      const res = await enablePush();
      if (res === "enabled") setOn(true);
      else if (res === "denied") setMsg("Notifications are blocked. Enable them in your browser settings.");
      else setMsg("This device does not support push notifications.");
    }
    setBusy(false);
  }

  if (supported === null) return null;

  return (
    <div className="raviion-card-shadow rounded-2xl bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-indigo">Push notifications on this device</span>
          <span className="block text-xs text-indigo/55">
            Get alerts for transactions, rewards and account activity.
          </span>
        </span>
        {supported ? (
          <button
            onClick={toggle}
            disabled={busy}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${
              on ? "bg-raviion-green/10 text-raviion-green" : "bg-indigo text-white"
            }`}
          >
            {busy ? "…" : on ? "On" : "Enable"}
          </button>
        ) : (
          <span className="shrink-0 text-xs text-indigo/40">Unavailable</span>
        )}
      </div>
      {iosNeedsInstall && (
        <p className="mt-2 text-xs text-indigo/50">
          On iPhone, add raviion to your Home Screen first (Share, then Add to Home Screen). Push works from the
          installed app on iOS 16.4 and newer.
        </p>
      )}
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
