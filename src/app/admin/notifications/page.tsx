import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { NotificationsConsole } from "./NotificationsConsole";

export default function AdminNotificationsPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <NotificationsConsole />
    </AdminShell>
  );
}
