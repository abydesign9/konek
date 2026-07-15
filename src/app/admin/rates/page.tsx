import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { RatesConsole } from "./RatesConsole";

export default function RatesPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <RatesConsole />
    </AdminShell>
  );
}
