import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentPage } from "@/lib/content/contentPages";

export const dynamic = "force-dynamic";

// Renders one section's plain-text body: consecutive "- " lines become a bullet
// list, blank lines separate paragraphs. No HTML is interpreted.
function Body({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: { type: "p" | "ul"; items: string[] }[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else if (line.trim() === "") {
      // paragraph break
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "p") last.items.push(line);
      else blocks.push({ type: "p", items: [line] });
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="flex flex-col gap-2">
            {b.items.map((it, j) => (
              <li key={j} className="relative pl-6 text-indigo/70">
                <span className="absolute left-1 top-2.5 h-1.5 w-1.5 rounded-sm bg-konek-green" />
                {it}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-indigo/70">
            {b.items.join(" ")}
          </p>
        )
      )}
    </div>
  );
}

export default async function AboutPage() {
  const page = await getContentPage("about");
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto max-w-3xl px-5 pb-4 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo">
          <span className="h-5 w-5 rounded-md bg-gradient-to-br from-indigo to-konek-green" />
          Konek
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-10 pt-4">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-indigo sm:text-4xl">
          {page.title}
        </h1>
        {page.subtitle && <p className="mt-4 max-w-2xl text-lg text-indigo/60">{page.subtitle}</p>}
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 pb-24">
        {page.sections.map((s, i) => (
          <article key={i} className="rounded-3xl border border-indigo/10 bg-white p-6 sm:p-8 konek-card-shadow">
            {s.label && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-konek-green">{s.label}</p>
            )}
            {s.heading && <h2 className="mb-3 font-heading text-xl font-bold text-indigo sm:text-2xl">{s.heading}</h2>}
            <Body text={s.body} />
          </article>
        ))}

        <footer className="mt-4 flex items-center justify-between border-t border-indigo/10 pt-6 text-sm text-indigo/45">
          <span className="inline-flex items-center gap-2 font-semibold text-indigo/70">
            <span className="h-4 w-4 rounded bg-gradient-to-br from-indigo to-konek-green" />
            Konek
          </span>
          <Link href="/signup" className="font-semibold text-konek-green">
            Get started →
          </Link>
        </footer>
      </div>
    </main>
  );
}
