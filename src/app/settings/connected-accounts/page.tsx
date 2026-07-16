import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { ConnectedAccountsClient } from "./ConnectedAccountsClient";

export default async function ConnectedAccountsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <ConnectedAccountsClient />;
}
