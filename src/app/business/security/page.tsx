import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { SecurityClient } from "./SecurityClient";

export default async function BusinessSecurityPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <SecurityClient />;
}
