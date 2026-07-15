"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  general: "General",
  kyc: "Verification",
  payments: "Payments",
  vtu: "Airtime & Bills",
  esim: "eSIM",
  card: "Cards",
  dollar_account: "Dollar Account",
};

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => setFaqs(data.faqs ?? []));
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Faq[]> = {};
    for (const f of faqs ?? []) (g[f.category] ??= []).push(f);
    return g;
  }, [faqs]);

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Help center" backHref="/support" backLabel="Support" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-indigo/60 mb-6">
          Quick answers before you contact support. Still stuck?{" "}
          <Link href="/support" className="text-indigo underline">Open a ticket</Link>.
        </p>

        {faqs === null && <p className="text-sm text-indigo/50">Loading…</p>}
        {faqs !== null && faqs.length === 0 && (
          <p className="text-sm text-indigo/50">No help articles published yet.</p>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo/40 mb-2">
              {CATEGORY_LABEL[category] ?? category}
            </p>
            <div className="flex flex-col gap-2">
              {items.map((f) => (
                <details key={f.id} className="group rounded-xl bg-white border border-indigo/10 px-4 py-3">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-indigo">
                    {f.question}
                    <span className="ml-3 text-konek-green transition-transform group-open:rotate-45 text-lg leading-none">
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-indigo/70 leading-relaxed pt-2">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
