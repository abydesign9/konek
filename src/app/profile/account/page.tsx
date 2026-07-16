import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { PageHeader } from "@/components/PageHeader";
import { AccountClient } from "./AccountClient";

export default async function AccountPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Account information" backHref="/profile" />
      <AccountClient />
    </main>
  );
}
