import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployeesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return <EmployeesClient />;
}
