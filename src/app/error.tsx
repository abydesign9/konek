"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
      <h1 className="font-heading text-xl font-bold text-indigo mb-2">Something went wrong</h1>
      <p className="text-sm text-indigo/60 mb-8 max-w-xs">
        That didn&apos;t work as expected. Nothing was charged — try again, or head back home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-indigo text-white font-semibold px-6 py-3"
        >
          Try again
        </button>
        <a href="/home" className="rounded-xl border border-indigo/20 text-indigo font-semibold px-6 py-3">
          Back to home
        </a>
      </div>
    </main>
  );
}
