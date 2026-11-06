// Central contact + social details, so support UI and the live-chat bubble stay
// in sync. Placeholders for now — swap for the real handles/numbers when ready.
export const CONTACT = {
  whatsappNumber: "07040147477",
  whatsappIntl: "2347040147477", // wa.me needs the international form, no +
  phone: "07040147477",
  email: "support@raviion.app",
};

export function whatsappLink(text = "Hi raviion, I need help with my account."): string {
  return `https://wa.me/${CONTACT.whatsappIntl}?text=${encodeURIComponent(text)}`;
}

export const SOCIALS: { label: string; handle: string; href: string; icon: string }[] = [
  { label: "Instagram", handle: "@raviion", href: "https://instagram.com/raviion", icon: "📸" },
  { label: "X", handle: "@raviion", href: "https://x.com/raviion", icon: "𝕏" },
  { label: "Facebook", handle: "@raviion", href: "https://facebook.com/raviion", icon: "📘" },
  { label: "TikTok", handle: "@raviion", href: "https://tiktok.com/@raviion", icon: "🎵" },
  { label: "YouTube", handle: "@raviion", href: "https://youtube.com/@raviion", icon: "▶️" },
];
