import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { UsersConsole } from "./UsersConsole";

export default function UsersPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <UsersConsole />
    </AdminShell>
  );
}
