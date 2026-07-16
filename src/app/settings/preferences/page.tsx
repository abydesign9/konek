import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { PreferencesClient } from "./PreferencesClient";

export default async function PreferencesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <PreferencesClient />;
}
