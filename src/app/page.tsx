import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

const SERVICES = ["Airtime", "Data", "Cable", "Electricity", "Exam Pin", "Betting", "Intl Top-up", "eSIM"];

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows } = await query<{ phone: string }>(`SELECT phone FROM users WHERE id = $1`, [userId]);
  const phone = rows[0]?.phone;

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <header className="mb-8">
        <p className="text-sm text-indigo/60">Welcome back</p>
        <h1 className="font-heading text-xl font-bold text-indigo">{phone}</h1>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {SERVICES.map((label) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-konek-green" />
            </div>
            <span className="text-xs text-center text-indigo font-medium">{label}</span>
          </div>
        ))}
      </section>

      <form action="/api/auth/logout" method="post" className="mt-12">
        <button type="submit" className="text-sm text-indigo/60 underline">
          Log out
        </button>
      </form>
    </main>
  );
}
