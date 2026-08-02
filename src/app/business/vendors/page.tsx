import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { VendorsClient } from "./VendorsClient";

export default async function BusinessVendorsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <VendorsClient />;
}
