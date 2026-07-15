import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { SettingsConsole } from "./SettingsConsole";

export default function AdminSettingsPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <SettingsConsole />
    </AdminShell>
  );
}
