import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { MarketplaceConsole } from "./MarketplaceConsole";

export default function MarketplacePage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell adminEmail={session.email}>
      <MarketplaceConsole />
    </AdminShell>
  );
}
