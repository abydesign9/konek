// Instant skeleton shown while the home dashboard's data batch resolves (App
// Router renders this as the Suspense fallback). Mirrors the real layout so the
// page doesn't shift when content arrives.
export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="animate-pulse">
        {/* Greeting + wallet */}
        <section className="px-5 pt-6">
          <div className="h-4 w-28 rounded bg-indigo/10" />
          <div className="mt-5 rounded-2xl bg-white px-5 py-6 konek-card-shadow">
            <div className="h-3 w-24 rounded bg-indigo/10" />
            <div className="mt-3 h-8 w-40 rounded bg-indigo/15" />
            <div className="mt-4 flex gap-3">
              <div className="h-9 flex-1 rounded-xl bg-indigo/10" />
              <div className="h-9 flex-1 rounded-xl bg-indigo/10" />
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-7 px-5">
          <div className="h-3 w-20 rounded bg-indigo/10" />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-11 w-11 rounded-xl bg-indigo/10" />
                <div className="h-2.5 w-10 rounded bg-indigo/10" />
              </div>
            ))}
          </div>
          <div className="mt-6 h-3 w-24 rounded bg-indigo/10" />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-11 w-11 rounded-xl bg-indigo/10" />
                <div className="h-2.5 w-10 rounded bg-indigo/10" />
              </div>
            ))}
          </div>
        </section>

        {/* Promo banner */}
        <section className="mt-6 px-5">
          <div className="h-28 w-full rounded-2xl bg-indigo/10" />
        </section>

        {/* Recent */}
        <section className="mt-7 px-5">
          <div className="h-3 w-32 rounded bg-indigo/10" />
          <div className="mt-3 flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 w-full rounded-2xl bg-white konek-card-shadow" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
