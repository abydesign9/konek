"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid admin secret");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Konek Admin</h1>
      <p className="text-sm text-indigo/60 mb-8">Founder console — internal use only</p>
      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
          className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
