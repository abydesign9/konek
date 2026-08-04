// Evergreen, hand-written guides for the marketing blog. Plain-text bodies
// ("- " lines become bullets, blank lines split paragraphs, "## " lines are
// subheadings) so there's no HTML-injection surface. Dates reflect when the
// guide was authored/last reviewed.

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO
  readMinutes: number;
  body: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-receive-usd-in-nigeria",
    title: "How to receive USD in Nigeria as a freelancer or creator",
    excerpt:
      "Getting paid by international clients shouldn't cost you days and a chunk of every invoice. Here's a simpler way to receive and use your dollars.",
    category: "Getting paid globally",
    date: "2026-07-29",
    readMinutes: 5,
    body: `If you earn from clients, platforms or brands abroad, the hardest part is often just receiving your own money. Here's how to make it simple with Konek.

## Why receiving USD is usually painful
Traditional routes — third-party processors, borrowed accounts, or asking a friend abroad — are slow, risky and expensive. Payments bounce, fees stack up, and you rarely control the exchange rate.

## A dollar account in your name
With Konek you can open a USD account in your own name, even as a non-US resident. You share your account details with clients and platforms and receive payments directly.

- Get paid by clients and marketplaces worldwide
- Hold your balance in USD until you're ready
- Convert to Naira when the rate works for you

## Steps to get started
1. Create your Konek account and verify your identity once.
2. Open your USD account and copy your receiving details.
3. Share those details with your client or platform.
4. Watch payments land, then spend with a card, hold, or convert.

## Keep more of what you earn
Because your money lands directly and converts on your terms, you keep more of every invoice — and you get paid faster.

Ready to get paid globally? Create your Konek account and open your USD account in minutes.`,
  },
  {
    slug: "esim-explained-stay-online-abroad",
    title: "eSIM explained: stay online abroad without roaming bills",
    excerpt:
      "An eSIM lets you land in a new country and get online in minutes — no SIM swap, no shocking roaming charges. Here's how it works.",
    category: "Travel & eSIM",
    date: "2026-07-29",
    readMinutes: 4,
    body: `Roaming charges are one of the last great travel rip-offs. An eSIM fixes that. Here's the plain-English version.

## What is an eSIM?
An eSIM is a digital SIM built into your phone. Instead of swapping a plastic card, you install a data plan digitally and switch it on — keeping your normal number for calls and texts.

## Why travellers love it
- Get online minutes after you land
- No roaming bill surprises
- Keep your main line active for calls and OTPs
- Pick local, regional or global plans for your trip

## How to use an eSIM with Konek
1. Choose your destination and a data plan in the app.
2. Buy and install the eSIM — it takes a couple of minutes.
3. Turn on the plan when you arrive and start browsing.

## Picking the right plan
Think about how long you'll travel and how much data you use. Short trip and light use? A small local plan is plenty. Multi-country trip? A regional or global plan saves juggling.

Travelling soon? Set up your eSIM before you fly so you're connected the moment you land.`,
  },
  {
    slug: "keep-your-konek-account-secure",
    title: "Keeping your Konek account secure: a simple checklist",
    excerpt:
      "A few small habits protect your money and data. Here's a quick checklist every Konek user should run through.",
    category: "Security & trust",
    date: "2026-07-29",
    readMinutes: 3,
    body: `Your money and identity deserve strong protection. Konek secures your account with encryption, PINs and fraud monitoring — and these habits add an extra layer.

## Your security checklist
- Set a strong, unique password you don't use anywhere else.
- Keep your transaction PIN private — Konek staff will never ask for it.
- Turn on every verification step we offer; it protects you, not just us.
- Review your active sessions and log out ones you don't recognise.
- Be alert to phishing: we'll never ask for your password or PIN by message.

## If something feels wrong
Act quickly. Change your password, review your sessions, and reach our support team in the app — we're available 24/7.

## Why we ask for verification
Verification (KYC) confirms you are you. It's what lets us safely unlock funding, accounts and cards while keeping fraudsters out. We only ask for what your country's rules require, and your details are encrypted.

Staying safe is a shared effort — a couple of minutes on this checklist goes a long way.`,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
