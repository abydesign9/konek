import Link from "next/link";
import { IconArrowLeft } from "./icons";

// Consistent in-app page header: back button + centered title + optional
// right-side action, sticky so it stays reachable while scrolling. Used on
// every screen below /home so navigation is never a dead end on mobile.
//
// The back button is deliberately the boldest thing in this header — a
// solid-filled 44px circle (the standard minimum touch target) with a
// heavy-stroke arrow at full indigo, not a faint text link. It's the
// single most-tapped control on every screen here, so a user should never
// have to look for it or tap twice.
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
  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-indigo/10">
      <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href={backHref}
          className="konek-card-shadow konek-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-indigo active:scale-95"
          aria-label={backLabel}
        >
          <IconArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 min-w-0 truncate text-center font-heading text-base font-bold text-indigo">
          {title}
        </h1>
        <div className="flex min-w-[2.75rem] shrink-0 justify-end text-sm">{right}</div>
      </div>
    </nav>
  );
}
