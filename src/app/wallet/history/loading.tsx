import { PageHeader } from "@/components/PageHeader";

// Instant skeleton while the transactions query resolves.
export default function HistoryLoading() {
  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Transactions" backHref="/home" />
      <div className="max-w-lg mx-auto px-6 py-6">
        <div className="mb-6 flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-full bg-indigo/10" />
          <div className="h-8 w-16 animate-pulse rounded-full bg-indigo/10" />
        </div>
        <ul className="flex animate-pulse flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between rounded-2xl border border-indigo/10 bg-white px-4 py-3.5">
              <div className="space-y-2">
                <div className="h-3.5 w-28 rounded bg-indigo/10" />
                <div className="h-2.5 w-40 rounded bg-indigo/5" />
              </div>
              <div className="space-y-2 text-right">
                <div className="ml-auto h-3.5 w-16 rounded bg-indigo/10" />
                <div className="ml-auto h-2.5 w-12 rounded bg-indigo/5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
