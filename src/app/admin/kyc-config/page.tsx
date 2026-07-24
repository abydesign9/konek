import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { KycConfigConsole } from "./KycConfigConsole";

export default function KycConfigPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <KycConfigConsole />
    </AdminShell>
  );
}
