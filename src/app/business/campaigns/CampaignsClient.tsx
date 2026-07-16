"use client";

import { useEffect, useState } from "react";
import { BusinessShell, BizIcons } from "@/components/BusinessShell";

export function CampaignsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => setBusinessName(d.business?.legal_name));
  }, []);

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Campaigns</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Group related benefits together — like &quot;Graduate Trainee Welcome&quot; or &quot;December Bonus
          Data&quot; — instead of tracking one-off distributions.
        </p>

        <div className="konek-card-shadow mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo/10">
            <BizIcons.Campaigns className="h-6 w-6 text-indigo" />
          </div>
          <p className="font-heading text-base font-bold text-indigo">Campaigns are coming soon</p>
          <p className="max-w-sm text-sm text-text-secondary">
            For now, every Distribution and Recurring Benefit runs on its own. Grouping them into a
            campaign with a shared budget and timeline is being built next.
          </p>
        </div>
      </div>
    </BusinessShell>
  );
}
