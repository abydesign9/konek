import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth/session";
import { PageHeader } from "@/components/PageHeader";
import { IconChevronRight, IconHelp, IconInfo, IconShield } from "@/components/icons";

const LINKS = [
  { label: "FAQs", sub: "Answers to common questions", Icon: IconHelp, href: "/support/faq" },
  { label: "Contact support", sub: "Reach the raviion team directly", Icon: IconHelp, href: "/support" },
  { label: "Terms of service", sub: "The agreement covering your use of raviion", Icon: IconShield, href: "/settings/terms" },
  { label: "Privacy policy", sub: "How your data is handled", Icon: IconShield, href: "/settings/privacy" },
];

export default async function AboutPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="About raviion" backHref="/profile" />
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
        <section className="raviion-card-shadow flex items-center gap-3 rounded-2xl bg-white px-5 py-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
            <IconInfo className="h-6 w-6 text-indigo" />
          </span>
          <div>
            <p className="font-heading text-base font-bold text-indigo">raviion</p>
            <p className="text-sm text-indigo/55">A digital connectivity platform for life across borders.</p>
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          {LINKS.map(({ label, sub, Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="raviion-card-shadow raviion-tile flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
                <Icon className="h-5 w-5 text-indigo" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-indigo">{label}</span>
                <span className="block text-xs text-indigo/55">{sub}</span>
              </span>
              <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
