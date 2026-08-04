"use client";

import { useState } from "react";

// Uses the Web Share API where available (mobile PWAs), falling back to
// copying a plain-text summary to the clipboard on desktop.
export function ShareReceiptButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const payload = { title, text: `${text}\n${url}` };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="text-sm font-semibold text-konek-green hover:underline"
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
