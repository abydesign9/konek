// Self-contained avatars — no external service, so they always render (offline,
// PWA, no CSP concerns). An avatar value is either "emoji:<char>" (a picked
// preset) or empty/legacy, in which case we fall back to the user's initials.

export const AVATAR_PRESETS = [
  "🦊", "🐨", "🦁", "🐯", "🐼",
  "🦄", "🐧", "🦉", "🐸", "🐵",
  "🐱", "🐶", "🐰", "🐹", "🐷",
];

// Soft brand-adjacent backgrounds, chosen deterministically per emoji so each
// avatar has a stable, distinct tint.
const BACKGROUNDS = [
  "#E8ECF7", // indigo tint
  "#DFF6EE", // green tint
  "#FDF0D9", // gold tint
  "#F0E9FB", // violet tint
  "#E6F1FB", // sky tint
];

export function emojiValue(emoji: string): string {
  return `emoji:${emoji}`;
}

export function parseAvatar(value: string | null | undefined): { emoji: string; bg: string } | null {
  if (!value || !value.startsWith("emoji:")) return null;
  const emoji = value.slice("emoji:".length);
  if (!emoji) return null;
  const idx = Math.max(0, AVATAR_PRESETS.indexOf(emoji));
  return { emoji, bg: BACKGROUNDS[idx % BACKGROUNDS.length] };
}

export function initials(name: string | null | undefined, fallback = "K"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
