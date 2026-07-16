import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { SessionsClient } from "./SessionsClient";

export default async function SessionsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <SessionsClient />;
}
