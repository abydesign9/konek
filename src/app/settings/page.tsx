import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { SettingsClient } from "./SettingsClient";

// /settings is the Privacy & security detail reached from the Profile hub.
// (The Profile hub at /profile is the single account menu; this page holds the
// security controls — PIN, password, biometrics, sessions, close account.)
export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <SettingsClient />;
}
