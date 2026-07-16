import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { SettingsConsole } from "./SettingsConsole";

export default function AdminSettingsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <SettingsConsole />
    </AdminShell>
  );
}
