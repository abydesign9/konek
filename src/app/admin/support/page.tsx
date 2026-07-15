import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { SupportConsole } from "./SupportConsole";

export default function AdminSupportPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <SupportConsole />
    </AdminShell>
  );
}
