import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { CampaignsClient } from "./CampaignsClient";

export default async function CampaignsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <CampaignsClient />;
}
