import type { ReactNode } from "react";

export type IconProps = { className?: string };

function Base({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="2" />
    <rect x="14" y="3" width="7" height="5" rx="2" />
    <rect x="14" y="12" width="7" height="9" rx="2" />
    <rect x="3" y="16" width="7" height="5" rx="2" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    <circle cx="17.5" cy="8.5" r="2.4" />
    <path d="M16 14.7c2.5.3 4.3 2 5 5.3" />
  </Base>
);

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Base>
);

export const SupportIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3a8 8 0 0 0-8 8v4a2 2 0 0 0 2 2h1v-6H5v-.2A7 7 0 0 1 19 10.8v.2h-2v6h1a2 2 0 0 0 2-2v-4a8 8 0 0 0-8-8Z" />
    <path d="M17 19a2 2 0 0 1-2 2h-2" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);

export const LogoutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Base>
);

// New for this session's admin pages (didn't exist in the earlier icon set)
export const RatesIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 17V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M8 13l2.5 2.5L16 10" />
  </Base>
);

export const ReferralsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="17" r="3" />
    <path d="M9.5 8.5 14.5 15.5" />
    <path d="M17 8V5a2 2 0 0 0-2-2h-2" />
  </Base>
);

export const ProvidersIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="6" rx="2" />
    <rect x="3" y="14" width="18" height="6" rx="2" />
    <circle cx="7" cy="7" r="0.6" fill="currentColor" />
    <circle cx="7" cy="17" r="0.6" fill="currentColor" />
  </Base>
);
