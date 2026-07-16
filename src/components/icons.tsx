// Bold, filled, single-color-per-service icons — MoMo/OPay style.
// Each icon is a literal picture (lightbulb, TV, plane...), not an abstract
// line-glyph, so low-literacy users navigate by shape + color, not by reading.
// Every icon ships with its own brand color via SERVICE_COLORS — never render
// these all in one flat tint again.

export const SERVICE_COLORS: Record<string, { bg: string; fg: string }> = {
  airtime:   { bg: "#FFF3D6", fg: "#E2932F" }, // gold
  data:      { bg: "#E3F2FD", fg: "#1E88E5" }, // sky blue
  cable:     { bg: "#F3E8FF", fg: "#8E44AD" }, // purple (TV/entertainment)
  electricity: { bg: "#FFF9DB", fg: "#F5A623" }, // bright amber (lightbulb)
  exam:      { bg: "#E8F8F0", fg: "#1E9E6B" }, // green (graduation)
  betting:   { bg: "#FDEAEA", fg: "#E0473B" }, // red-orange
  gift:      { bg: "#FFF3D6", fg: "#E2932F" }, // gold (gift box)
  intl:      { bg: "#E6F0FF", fg: "#22315C" }, // indigo (globe)
  esim:      { bg: "#E8F8F0", fg: "#00C48C" }, // konek green (plane/travel)
  dollar:    { bg: "#E8F8F0", fg: "#1E9E6B" }, // green (USD account)
  card:      { bg: "#F3E8FF", fg: "#8E44AD" }, // purple (virtual card)
  wallet:    { bg: "#E6F0FF", fg: "#22315C" },
  more:      { bg: "#F1F1F4", fg: "#6B7280" },
};

// ---------- Network brand chips (real carrier colors, not our palette) ----------
export const NETWORK_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  mtn:     { bg: "#FFDD00", fg: "#1A1A1A", label: "MTN" },
  airtel:  { bg: "#E30613", fg: "#FFFFFF", label: "Airtel" },
  glo:     { bg: "#0B8A3E", fg: "#FFFFFF", label: "Glo" },
  "9mobile": { bg: "#00543C", fg: "#FFFFFF", label: "9mobile" },
};

function Base({ children, ...props }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      {children}
    </svg>
  );
}

// Filled phone with a signal-bar face — reads as "airtime/credit" at a glance.
export function IconAirtime(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <rect x="9" y="17.2" width="6" height="2" rx="1" fill="white" />
      <path d="M8.5 6.5h1.6v6.5H8.5zM10.9 8h1.6v5H10.9zM13.3 9.3h1.6v3.7h-1.6zM15.7 5.8h1.6v7.2h-1.6z" fill="white" />
    </Base>
  );
}

// Filled wifi/signal bowl — data.
export function IconData(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M4.2 13.4a11 11 0 0 1 15.6 0l-2.2 2.2a7.8 7.8 0 0 0-11.2 0l-2.2-2.2Z" />
      <path d="M7.7 9.9a15.7 15.7 0 0 1 8.6 0l-2 2a12.7 12.7 0 0 0-4.6 0l-2-2Z" opacity=".55" />
    </Base>
  );
}

// Filled TV — cable.
export function IconCable(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5" width="19" height="13" rx="2.5" />
      <rect x="9" y="20" width="6" height="1.8" rx=".9" />
      <path d="M6 8.5h9v2H6z" fill="white" opacity=".85" />
    </Base>
  );
}

// Filled lightning bolt — electricity, unmistakable.
export function IconElectricity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M13 1.5 3.6 13.8a1 1 0 0 0 .8 1.6H10l-1.3 8.1a.7.7 0 0 0 1.25.55l10-13.4a1 1 0 0 0-.8-1.6H14l1.25-6.95a.7.7 0 0 0-1.25-.6Z" />
    </Base>
  );
}

// Filled graduation cap — exam pins.
export function IconExam(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3 2 8l10 5 8-4v6h2V8L12 3Z" />
      <path d="M6 11.3V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.7l-6 3-6-3Z" />
    </Base>
  );
}

// Filled trophy/ball — betting.
export function IconBetting(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M7 3h10v2h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4h-.2A6 6 0 0 1 13 14.9V18h3v2H8v-2h3v-3.1A6 6 0 0 1 7.2 11H7A4 4 0 0 1 3 7V6a1 1 0 0 1 1-1h3V3Zm0 4H5a2 2 0 0 0 2 2V7Zm10 0v2a2 2 0 0 0 2-2h-2Z" />
    </Base>
  );
}

// Filled globe — international top-up.
export function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path
        d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5Z"
        stroke="white"
        strokeWidth="1.4"
        fill="none"
      />
    </Base>
  );
}

// Filled paper-plane in a card — eSIM (travel).
export function IconEsim(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 15.5 17 9l-3 8-2-2.5-4 1Z" fill="white" />
    </Base>
  );
}

export function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 2.5 19 5.5v6c0 5-3 8.7-7 10-4-1.3-7-5-7-10v-6l7-3Z" />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function IconBolt(props: React.SVGProps<SVGSVGElement>) {
  return <IconElectricity {...props} />;
}

// Filled wallet with a coin — money in.
export function IconWallet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2H4V7Z" />
      <rect x="2.5" y="7.5" width="19" height="13" rx="2.5" />
      <circle cx="16.5" cy="14" r="2" fill="white" />
    </Base>
  );
}

// Filled grid-of-dots — "More" tile.
export function IconMore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="12" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
    </Base>
  );
}

// Filled gift box — rewards.
export function IconGift(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="9.5" width="18" height="4" rx="1" />
      <rect x="4.5" y="13.5" width="15" height="8" rx="1.5" />
      <rect x="11" y="9.5" width="2" height="12" fill="white" opacity=".85" />
      <path d="M12 9.5c-1.5-3.5-6-4-6-1s4.5 1.5 6 1Zm0 0c1.5-3.5 6-4 6-1s-4.5 1.5-6 1Z" />
    </Base>
  );
}

// Filled bell — notifications.
export function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 2.5a5.5 5.5 0 0 0-5.5 5.5v3.1c0 .8-.3 1.6-.9 2.2L4 15.2c-.6.6-.2 1.6.6 1.6h14.8c.8 0 1.2-1 .6-1.6l-1.6-1.9a3 3 0 0 1-.9-2.2V8A5.5 5.5 0 0 0 12 2.5Z" />
      <circle cx="12" cy="20" r="2" />
    </Base>
  );
}

// Clock face — transaction history.
export function IconHistory(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6.5v6l4 2.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Base>
  );
}

// Filled person silhouette — profile.
export function IconProfile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="7.5" r="4.2" />
      <path d="M4 20.5c.9-4.2 3.9-6.5 8-6.5s7.1 2.3 8 6.5c.1.6-.3 1-.9 1H4.9c-.6 0-1-.4-.9-1Z" />
    </Base>
  );
}

// Filled house — home tab.
export function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 2.8 2.5 10.6c-.5.4-.2 1.2.4 1.2H4.5v8.4c0 .6.4 1 1 1H10v-6h4v6h4.5c.6 0 1-.4 1-1v-8.4h1.6c.6 0 .9-.8.4-1.2Z" />
    </Base>
  );
}

// Filled coin with a dollar mark — USD account.
export function IconDollar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path
        d="M12 6.5v11M15 9c0-1.4-1.3-2.2-3-2.2S9 7.6 9 9c0 3 6 1.6 6 4.6 0 1.4-1.5 2.2-3 2.2s-3-.8-3-2.2"
        fill="none"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Base>
  );
}

// Filled card with a stripe — virtual card.
export function IconCard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <rect x="2.5" y="8.5" width="19" height="3" fill="white" opacity=".9" />
      <rect x="5" y="14.5" width="6" height="2" rx="1" fill="white" opacity=".85" />
    </Base>
  );
}

// Filled circle with a question mark — get help / support.
export function IconHelp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path
        d="M9.5 9.3a2.6 2.6 0 0 1 5-.8c0 1.7-2.5 1.8-2.5 3.7"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.3" r="1.1" fill="white" />
    </Base>
  );
}

// Filled sliders — preferences.
export function IconSliders(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="5.5" width="18" height="2.4" rx="1.2" />
      <rect x="3" y="10.8" width="18" height="2.4" rx="1.2" />
      <rect x="3" y="16.1" width="18" height="2.4" rx="1.2" />
      <circle cx="8" cy="6.7" r="2.3" fill="white" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="12" r="2.3" fill="white" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="17.3" r="2.3" fill="white" stroke="currentColor" strokeWidth="1.4" />
    </Base>
  );
}

// Filled link — connected accounts.
export function IconLink(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="2.3" y="8.5" width="10" height="7" rx="3.5" />
      <rect x="11.7" y="8.5" width="10" height="7" rx="3.5" />
      <rect x="8" y="10.2" width="8" height="3.6" rx="1.8" fill="white" />
    </Base>
  );
}

// Filled circle with an "i" — about / info.
export function IconInfo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <rect x="10.9" y="10" width="2.2" height="7" rx="1.1" fill="white" />
      <circle cx="12" cy="7.3" r="1.3" fill="white" />
    </Base>
  );
}

// Chevron-right — nav row affordance.
export function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
