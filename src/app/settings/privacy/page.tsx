import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { AppLegalShell } from "@/components/AppLegalShell";
import { PrivacyPolicyContent } from "@/app/privacy/PrivacyPolicyContent";

// Signed-in equivalent of the public /privacy page — same content, rendered
// inside the app shell under the strict-CSP subtree instead of sending the
// user out to the public marketing site.
export default async function AppPrivacyPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <AppLegalShell title="Privacy Policy" updated="July 2026" backHref="/settings">
      <PrivacyPolicyContent />
    </AppLegalShell>
  );
}
