import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { CardProductsConsole } from "./CardProductsConsole";

export default function CardProductsPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <CardProductsConsole />
    </AdminShell>
  );
}
