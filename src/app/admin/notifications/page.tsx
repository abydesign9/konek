import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { NotificationsConsole } from "./NotificationsConsole";

export default function AdminNotificationsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <NotificationsConsole />
    </AdminShell>
  );
}
