import Link from "next/link";

// Consistent in-app page header: back arrow + centered title + optional
// right-side action, sticky so it stays reachable while scrolling. Used on
// every screen below /home so navigation is never a dead end on mobile.
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
      <div className="max-w-lg mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm font-medium text-indigo/60 hover:text-indigo shrink-0"
          aria-label={backLabel}
        >
          <span aria-hidden className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>
        <h1 className="flex-1 min-w-0 truncate text-center font-heading text-base font-bold text-indigo">
          {title}
        </h1>
        <div className="shrink-0 min-w-[1.5rem] text-right text-sm">{right}</div>
      </div>
    </nav>
  );
}
