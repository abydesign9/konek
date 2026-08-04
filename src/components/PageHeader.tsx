"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { IconArrowLeft } from "./icons";

// Consistent in-app page header: back button + centered title + optional
// right-side action, sticky so it stays reachable while scrolling.
//
// The back button goes to the ACTUAL previous page (router.back()) so it
// mirrors native app navigation — it never yanks you to a fixed page you
// didn't come from. `backHref` is the fallback when there's no history to pop
// (deep link / fresh tab / PWA cold start). Super-responsive: a real button
// with instant press-scale and no tap delay.
export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  right,
}: {
  title: string;
  backHref: string;
  backLabel?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();

  const goBack = useCallback(() => {
    // history.length > 1 means there's an in-app page to return to. On a cold
    // deep-link it's 1, so fall back to backHref.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }, [router, backHref]);

  return (
    <nav className="border-b border-indigo/10 bg-background">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          aria-label={backLabel}
          className="konek-card-shadow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-indigo transition-transform duration-100 active:scale-90"
          style={{ touchAction: "manipulation" }}
        >
          <IconArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-heading text-base font-bold text-indigo">{title}</h1>
        <div className="flex min-w-[2.75rem] shrink-0 justify-end text-sm">{right}</div>
      </div>
    </nav>
  );
}
