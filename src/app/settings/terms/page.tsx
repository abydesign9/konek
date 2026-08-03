import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { AppLegalShell } from "@/components/AppLegalShell";
import { TermsOfServiceContent } from "@/app/terms/TermsOfServiceContent";

// Signed-in equivalent of the public /terms page — same content, rendered
// inside the app shell under the strict-CSP subtree instead of sending the
// user out to the public marketing site.
export default async function AppTermsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <AppLegalShell title="Terms of Service" updated="July 2026" backHref="/settings">
      <TermsOfServiceContent />
    </AppLegalShell>
  );
}
