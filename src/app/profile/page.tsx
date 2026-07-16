import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { BottomNav } from "@/components/BottomNav";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-heading text-2xl font-bold text-indigo">Profile</h1>
      </header>
      <ProfileClient />
      <BottomNav />
    </main>
  );
}
