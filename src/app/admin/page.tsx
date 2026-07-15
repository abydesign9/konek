import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { AdminConsole } from "./AdminConsole";

export default function AdminPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <AdminConsole />
    </AdminShell>
  );
}
