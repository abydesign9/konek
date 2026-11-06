"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// When raviion is launched as an installed app (Home Screen / standalone display),
// the marketing landing page should never show. This sends the installed app
// straight into the product: /home, which itself redirects to /login when
// there's no session. In a normal browser tab the landing page renders as usual.
export function StandaloneRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari uses a non-standard flag.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) router.replace("/home");
  }, [router]);
  return null;
}
