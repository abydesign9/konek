import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { ReferralsConsole } from "./ReferralsConsole";

export default function ReferralsPage() {
  if (!isAdminSession()) redirect("/admin/login");
  return (
    <AdminShell>
      <ReferralsConsole />
    </AdminShell>
  );
}
