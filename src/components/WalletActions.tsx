import Link from "next/link";

export default function WalletActions() {
  return (
    <section className="mt-4 px-5">
      <div className="grid grid-cols-2 gap-3">

        <Link
          href="/wallet/fund"
          className="rounded-2xl bg-indigo px-4 py-4 text-center font-semibold text-white konek-card-shadow"
        >
          💰 Add Money
        </Link>

        <Link
          href="/wallet/withdraw"
          className="rounded-2xl bg-white border border-indigo/15 px-4 py-4 text-center font-semibold text-indigo konek-card-shadow"
        >
          🏦 Withdraw
        </Link>

      </div>
    </section>
  );
}
