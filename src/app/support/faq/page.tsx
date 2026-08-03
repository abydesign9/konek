import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { PageHeader } from "@/components/PageHeader";
import { FaqList } from "@/app/faq/FaqList";

// Signed-in equivalent of the public /faq page — same list (it fetches its
// own data from /api/faqs), rendered inside the app shell under the
// strict-CSP subtree instead of sending the user out to the public
// marketing site.
export default async function AppFaqPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="FAQs" backHref="/support" />
      <div className="mx-auto max-w-lg px-5 py-6">
        <FaqList />
      </div>
    </main>
  );
}
