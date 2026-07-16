import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { DistributionsClient } from "./DistributionsClient";

export default async function DistributionsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <DistributionsClient />;
}
