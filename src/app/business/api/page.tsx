import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { ApiClient } from "./ApiClient";

export default async function BusinessApiPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <ApiClient />;
}
