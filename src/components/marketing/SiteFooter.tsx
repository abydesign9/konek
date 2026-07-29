import Link from "next/link";

// Shared marketing-site footer. Groups every public destination and carries the
// Topton Global Consult attribution required across the site.
const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Products",
    links: [
      { label: "Personal", href: "/personal" },
      { label: "Business", href: "/business-solutions" },
      { label: "Connectivity", href: "/connectivity" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/company/careers" },
      { label: "Blog", href: "/company/blog" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Referrals", href: "/referrals" },
      { label: "Campus Ambassadors", href: "/ambassadors" },
      { label: "Influencers", href: "/influencers" },
      { label: "Creator Club", href: "/creator-club" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "FAQs", href: "/faq" },
      { label: "Video Guides", href: "/help/videos" },
      { label: "Get started", href: "/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-indigo/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2 md:col-span-1">
            <span className="font-heading text-lg font-bold text-indigo">KONEK</span>
            <p className="mt-3 max-w-xs text-sm text-indigo/60">
              Global connectivity and payments for Africans at home and abroad — accounts, cards, eSIM and everyday bills in one app.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">{c.title}</p>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-indigo/70 transition-colors hover:text-konek-green">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-indigo/10 pt-6 text-xs text-indigo/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} KONEK. All rights reserved.</p>
          <p>Konek is a product of Topton Global Consult.</p>
        </div>
      </div>
    </footer>
  );
}
