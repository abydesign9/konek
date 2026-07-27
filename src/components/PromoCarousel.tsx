"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Homepage promo slider. Styled like the coins banner (rounded card, gradient,
// tap target) but auto-rotating and swipeable. Brand logos in the cards slide
// are sourced online from the Simple Icons CDN (single-colour SVGs, no auth).
interface Slide {
  href: string;
  gradient: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  logos?: string[]; // Simple Icons slugs, rendered white
}

const SLIDES: Slide[] = [
  {
    href: "/invite",
    gradient: "from-konek-green to-indigo",
    eyebrow: "Rewards",
    title: "You have $10 waiting",
    body: "Earn $10 for every friend who joins and transacts $100 or more.",
    cta: "Invite & earn",
  },
  {
    href: "/wallet/dollar-account",
    gradient: "from-indigo to-[#0d1b3e]",
    eyebrow: "USD Account",
    title: "Open a US bank account",
    body: "Start receiving money in USD, straight to your Konek wallet.",
    cta: "Get started",
  },
  {
    href: "/marketplace",
    gradient: "from-gold to-indigo",
    eyebrow: "Travel",
    title: "Get a global eSIM",
    body: "One SIM, works in 200+ countries. No roaming fees.",
    cta: "Browse plans",
  },
  {
    href: "/cards",
    gradient: "from-indigo to-konek-green",
    eyebrow: "Virtual Cards",
    title: "Pay bills & shop online",
    body: "Create a virtual card for your subscriptions and everyday spend.",
    cta: "Create a card",
    logos: ["netflix", "spotify", "amazon", "apple"],
  },
];

const ROTATE_MS = 5000;

export default function PromoCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  // Auto-advance. Pauses while the user is touching the track.
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % SLIDES.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [active]);

  // Keep the active dot in sync with native swipe scrolling.
  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    if (idx !== active) setActive(idx);
  }

  return (
    <section className="mt-5 px-5">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
        className="konek-scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
      >
        {SLIDES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`konek-card-shadow konek-tile block w-full shrink-0 snap-center rounded-2xl bg-gradient-to-r ${s.gradient} px-5 py-4 text-white`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{s.eyebrow}</p>
            <p className="mt-1 font-heading text-base font-bold leading-tight">{s.title}</p>
            <p className="mt-1 text-xs text-white/85">{s.body}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">{s.cta} →</span>
              {s.logos && (
                <div className="flex items-center gap-2">
                  {s.logos.map((slug) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={slug}
                      src={`https://cdn.simpleicons.org/${slug}/ffffff`}
                      alt=""
                      aria-hidden="true"
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] opacity-90"
                    />
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-2.5 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <span
            key={s.href}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-indigo" : "w-1.5 bg-indigo/25"}`}
          />
        ))}
      </div>
    </section>
  );
}
