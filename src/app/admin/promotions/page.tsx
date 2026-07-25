import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { PromotionsConsole } from "./PromotionsConsole";

export default function PromotionsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <PromotionsConsole />
    </AdminShell>
  );
}
