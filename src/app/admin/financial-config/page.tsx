import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { FinancialConfigConsole } from "./FinancialConfigConsole";

export default function FinancialConfigPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <FinancialConfigConsole />
    </AdminShell>
  );
}
