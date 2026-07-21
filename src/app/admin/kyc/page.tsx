import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { KycReviewConsole } from "./KycReviewConsole";

export default function AdminKycPage() {
  const session = getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell adminEmail={session.email}>
      <KycReviewConsole />
    </AdminShell>
  );
}
