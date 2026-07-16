import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { RecurringDistributionsClient } from "./RecurringDistributionsClient";

export default async function BusinessRecurringPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <RecurringDistributionsClient />;
}
