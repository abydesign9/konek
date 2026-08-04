"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// A thin top progress bar that appears the instant a link is tapped and clears
// when the destination renders. App Router server navigations otherwise give no
// feedback between tap and paint, which makes buttons feel unresponsive — this
// closes that gap so every tap acknowledges immediately.
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  // Show the bar on any in-app link tap (captured before navigation starts).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || /^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (a.getAttribute("href") === pathname) return; // same page
      setActive(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // The destination has rendered — clear the bar.
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5">
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-indigo to-konek-green transition-[width,opacity] duration-300 ease-out"
        style={{ width: active ? "92%" : "0%", opacity: active ? 1 : 0 }}
      />
    </div>
  );
}
