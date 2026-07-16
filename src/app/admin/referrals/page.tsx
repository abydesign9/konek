import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { ReferralsConsole } from "./ReferralsConsole";

export default function ReferralsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <ReferralsConsole />
    </AdminShell>
  );
}
