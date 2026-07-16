import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { OnboardingConsole } from "./OnboardingConsole";

export default function AdminOnboardingPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <OnboardingConsole />
    </AdminShell>
  );
}
