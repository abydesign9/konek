import { PageHeader } from "./PageHeader";

// In-app equivalent of the public marketing LegalShell — same prose styling,
// but wrapped in the app's own header/back-button chrome instead of the
// marketing site's nav+footer, and rendered under the strict-CSP app
// subtree. Used so a signed-in user reading Privacy/Terms never has to leave
// the authenticated app shell to see them.
export function AppLegalShell({
  title,
  updated,
  backHref,
  children,
}: {
  title: string;
  updated: string;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title={title} backHref={backHref} />
      <article className="mx-auto max-w-lg px-5 py-6">
        <p className="mb-4 text-xs text-indigo/50">Last updated {updated}</p>
        <div className="rounded-xl bg-gold/10 border border-gold/25 text-indigo/80 text-sm px-4 py-3 mb-8">
          This is a plain-language summary provided for transparency. Final terms are subject to
          review by qualified counsel in each market raviion operates in before public launch.
        </div>
        <div className="legal-prose flex flex-col gap-8 text-indigo/80 leading-relaxed">{children}</div>
      </article>
    </main>
  );
}
