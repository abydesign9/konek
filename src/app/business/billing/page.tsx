import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { BillingClient } from "./BillingClient";

export default async function BusinessBillingPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <BillingClient />;
}
