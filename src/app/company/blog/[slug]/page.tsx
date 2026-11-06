import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPage, CTA } from "@/components/marketing/ui";
import { BLOG_POSTS, getPost, formatDate } from "@/lib/marketing/blogPosts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPost(params.slug);
  if (!post) return { title: "Article not found — raviion" };
  return {
    title: `${post.title} — raviion Blog`,
    description: post.excerpt,
    alternates: { canonical: `/company/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, url: `/company/blog/${post.slug}`, type: "article" },
  };
}

// Renders a plain-text body: "## " lines are subheadings, "- " lines are
// bullets, "1." lines are ordered items, blank lines split paragraphs. No HTML
// is interpreted, so authored content can never inject markup.
function Article({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: { type: "h" | "p" | "ul" | "ol"; items: string[] }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;
    if (line.startsWith("## ")) {
      blocks.push({ type: "h", items: [line.slice(3)] });
    } else if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else if (/^\d+\.\s/.test(line)) {
      const item = line.replace(/^\d+\.\s/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "ol") last.items.push(item);
      else blocks.push({ type: "ol", items: [item] });
    } else {
      blocks.push({ type: "p", items: [line] });
    }
  }
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b, i) => {
        if (b.type === "h") return <h2 key={i} className="mt-4 font-heading text-2xl font-bold text-indigo">{b.items[0]}</h2>;
        if (b.type === "p") return <p key={i} className="text-lg leading-relaxed text-indigo/70">{b.items[0]}</p>;
        if (b.type === "ul")
          return (
            <ul key={i} className="flex flex-col gap-2">
              {b.items.map((it, j) => (
                <li key={j} className="relative pl-6 text-lg text-indigo/70">
                  <span className="absolute left-1 top-3 h-1.5 w-1.5 rounded-sm bg-raviion-green" />
                  {it}
                </li>
              ))}
            </ul>
          );
        return (
          <ol key={i} className="flex flex-col gap-2">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-3 text-lg text-indigo/70">
                <span className="font-bold text-raviion-green">{j + 1}.</span>
                {it}
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <MarketingPage>
      <article className="mx-auto max-w-3xl px-5 pt-14 pb-8 md:pt-20">
        <Link href="/company/blog" className="text-sm font-semibold text-raviion-green hover:text-indigo">← All articles</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-wide text-raviion-green">{post.category}</p>
        <h1 className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-indigo md:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-indigo/50">{formatDate(post.date)} · {post.readMinutes} min read</p>
        <p className="mt-6 text-xl leading-relaxed text-indigo/65">{post.excerpt}</p>
        <div className="mt-10">
          <Article text={post.body} />
        </div>
      </article>

      <CTA
        title="Ready to try raviion?"
        subtitle="Create your account in minutes and put this guide into practice."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "More articles", href: "/company/blog" }}
      />
    </MarketingPage>
  );
}
