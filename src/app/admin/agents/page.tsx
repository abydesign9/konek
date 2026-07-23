import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { AgentsConsole } from "./AgentsConsole";

export const dynamic = "force-dynamic";

export default function AdminAgentsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <AgentsConsole />
    </AdminShell>
  );
}
