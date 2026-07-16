import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <SettingsClient />;
}
