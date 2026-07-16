import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <ReportsClient />;
}
