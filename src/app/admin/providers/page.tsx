import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { ProvidersConsole } from "./ProvidersConsole";

export default function ProvidersPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <ProvidersConsole />
    </AdminShell>
  );
}
