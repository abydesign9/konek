import Image from "next/image";
import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-indigo/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo.png"
              alt="Konek logo"
              width={30}
              height={37}
              className="mix-blend-multiply"
            />
            <span className="font-heading text-xl font-bold text-indigo">Konek</span>
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-indigo text-white text-sm font-semibold px-5 py-2.5 hover:bg-indigo/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-indigo mb-2">{title}</h1>
        <p className="text-sm text-indigo/50 mb-4">Last updated {updated}</p>
        <div className="rounded-xl bg-gold/10 border border-gold/25 text-indigo/80 text-sm px-4 py-3 mb-10">
          This is a plain-language summary provided for transparency. Final terms are subject to
          review by qualified counsel in each market Konek operates in before public launch.
        </div>
        <div className="legal-prose flex flex-col gap-8 text-indigo/80 leading-relaxed">
          {children}
        </div>
      </article>

      <footer className="border-t border-indigo/10">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-indigo/50">
          <p>© {new Date().getFullYear()} Konek. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/terms" className="hover:text-indigo">Terms</Link>
            <Link href="/privacy" className="hover:text-indigo">Privacy</Link>
            <a href="mailto:support@konek.app" className="hover:text-indigo">support@konek.app</a>
          </p>
        </div>
      </footer>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-bold text-indigo mb-2">{heading}</h2>
      <div className="flex flex-col gap-3 text-[15px]">{children}</div>
    </section>
  );
}
