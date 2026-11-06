import Image from "next/image";
import { NETWORK_COLORS } from "./icons";

// Real carrier/provider marks (public/brand/telco_*.png) for the networks
// we actually have artwork for — telecoms and cable providers. Anything
// else (exam boards, betting platforms, gift-card brands, eSIM country
// packs) falls back to the existing brand-colored initial chip rather
// than inventing a logo image that doesn't exist.
const LOGO_SRC: Record<string, string> = {
  mtn: "/brand/telco_mtn.png",
  airtel: "/brand/telco_airtel.png",
  glo: "/brand/telco_glo.png",
  "9mobile": "/brand/telco_9mobile.png",
  dstv: "/brand/telco_dstv.png",
  gotv: "/brand/telco_gotv.png",
  startimes: "/brand/telco_startimes.png",
};

const FALLBACK_LABEL_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  ...NETWORK_COLORS,
  dstv: { bg: "#F3E8FF", fg: "#8E44AD", label: "DStv" },
  gotv: { bg: "#FFF3D6", fg: "#E2932F", label: "GOtv" },
  startimes: { bg: "#E8F8F0", fg: "#1E9E6B", label: "StarTimes" },
};

export function NetworkLogo({
  network,
  size = 44,
  className,
}: {
  network: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const key = (network ?? "").toLowerCase();
  const src = LOGO_SRC[key];

  if (src) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white raviion-card-shadow ${className ?? ""}`}
        style={{ width: size, height: size, padding: size * 0.16 }}
      >
        <Image src={src} alt={key} width={size} height={size} className="h-full w-full object-contain" />
      </span>
    );
  }

  const c = FALLBACK_LABEL_COLORS[key] ?? { bg: "#E6F0FF", fg: "#22315C", label: network ?? "?" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${className ?? ""}`}
      style={{ width: size, height: size, backgroundColor: c.bg, color: c.fg }}
    >
      {c.label.slice(0, 2).toUpperCase()}
    </span>
  );
}
