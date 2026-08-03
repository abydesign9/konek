import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/profile/getProfile";
import { ProfileClient } from "./ProfileClient";

// Fetching the profile row is a separate async component so it can sit inside
// a Suspense boundary — the header above paints immediately while this
// streams in, instead of the whole page (header included) blocking on the DB
// round trip before anything is visible.
async function ProfileBody({ userId }: { userId: string }) {
  const profile = await getProfile(userId);
  return <ProfileClient initial={profile} />;
}

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-heading text-2xl font-bold text-indigo">Profile</h1>
      </header>
      {/* ProfileClient's own null-profile branches double as the loading
          skeleton — same hero layout, pulsing placeholders, no extra
          skeleton component to keep in sync with the real one. */}
      <Suspense fallback={<ProfileClient initial={null} />}>
        <ProfileBody userId={userId} />
      </Suspense>
    </main>
  );
}
