import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/profile/getProfile";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Server-render the profile so the page paints with data immediately — no
  // client fetch waterfall / skeleton flash.
  const profile = await getProfile(userId);

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-heading text-2xl font-bold text-indigo">Profile</h1>
      </header>
      <ProfileClient initial={profile} />
    </main>
  );
}
