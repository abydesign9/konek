import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { RecurringTopupsClient } from "./RecurringTopupsClient";

export default async function RecurringTopupsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <RecurringTopupsClient />;
}
