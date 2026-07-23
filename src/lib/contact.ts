// Central contact + social details, so support UI and the live-chat bubble stay
// in sync. Placeholders for now — swap for the real handles/numbers when ready.
export const CONTACT = {
  whatsappNumber: "07040147477",
  whatsappIntl: "2347040147477", // wa.me needs the international form, no +
  phone: "07040147477",
  email: "support@konek.app",
};

export function whatsappLink(text = "Hi Konek, I need help with my account."): string {
  return `https://wa.me/${CONTACT.whatsappIntl}?text=${encodeURIComponent(text)}`;
}

export const SOCIALS: { label: string; handle: string; href: string; icon: string }[] = [
  { label: "Instagram", handle: "@konek", href: "https://instagram.com/konek", icon: "📸" },
  { label: "X", handle: "@konek", href: "https://x.com/konek", icon: "𝕏" },
  { label: "Facebook", handle: "@konek", href: "https://facebook.com/konek", icon: "📘" },
  { label: "TikTok", handle: "@konek", href: "https://tiktok.com/@konek", icon: "🎵" },
  { label: "YouTube", handle: "@konek", href: "https://youtube.com/@konek", icon: "▶️" },
];
