import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { CardsClient } from "./CardsClient";

export default async function BusinessCardsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <CardsClient />;
}
