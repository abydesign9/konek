"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { IconCard, IconChevronRight } from "@/components/icons";

function ComingSoonRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow opacity-70">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        <span className="block text-xs text-indigo/50">{sub}</span>
      </span>
      <span className="shrink-0 rounded-full bg-hover-tint px-2.5 py-1 text-[11px] font-semibold text-indigo/50">
        Coming soon
      </span>
    </div>
  );
}

export function ConnectedAccountsClient() {
  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Connected accounts" backHref="/profile" />

      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Cards</p>
          <Link
            href="/cards"
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
              <IconCard className="h-5 w-5 text-indigo" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-indigo">Virtual cards</span>
              <span className="block text-xs text-indigo/55">Manage cards linked to your wallet</span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
          </Link>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Mobile money and payment emails</p>
          <div className="flex flex-col gap-2.5">
            <ComingSoonRow label="Mobile money numbers" sub="Link a mobile money account for faster funding" />
            <ComingSoonRow label="Payment emails" sub="Save an alternate email for receipts and gateways" />
          </div>
        </section>
      </div>
    </main>
  );
}
