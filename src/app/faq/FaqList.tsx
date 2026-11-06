"use client";

import { useEffect, useMemo, useState } from "react";

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

export function FaqList() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => setFaqs(data.faqs ?? []))
      .catch(() => setFaqs([]));
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Faq[]> = {};
    for (const f of faqs ?? []) (g[f.category] ??= []).push(f);
    return g;
  }, [faqs]);

  return (
    <div>
      {faqs === null && <p className="text-sm text-indigo/50">Loading…</p>}
      {faqs !== null && faqs.length === 0 && (
        <p className="text-sm text-indigo/50">No help articles published yet.</p>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-raviion-green">
            {CATEGORY_LABEL[category] ?? category}
          </p>
          <div className="flex flex-col gap-2.5">
            {items.map((f) => (
              <details key={f.id} className="group rounded-2xl border border-indigo/10 bg-white px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-indigo">
                  {f.question}
                  <span className="ml-3 text-lg leading-none text-raviion-green transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pt-3 text-sm leading-relaxed text-indigo/70">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
