import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { AgentProgramConsole } from "./AgentProgramConsole";

export default function AgentProgramPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <AgentProgramConsole />
    </AdminShell>
  );
}
