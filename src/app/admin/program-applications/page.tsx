import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { ProgramApplicationsConsole } from "./ProgramApplicationsConsole";

export default function ProgramApplicationsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <ProgramApplicationsConsole />
    </AdminShell>
  );
}
