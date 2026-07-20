import Link from "next/link";

export default function WalletCurrencySwitcher() {
  const currencies = [
    ["USD","/wallet/global-account/usd"],
    ["GBP","/wallet/global-account/gbp"],
    ["EUR","/wallet/global-account/eur"],
  ];

  return (
    <section className="mt-5 px-5">

      <p className="mb-3 text-sm font-semibold text-indigo">
        Global currencies
      </p>

      <div className="grid grid-cols-3 gap-3">

      {currencies.map(([name,href])=>(
        <Link
          key={name}
          href={href}
          className="rounded-2xl bg-white border border-indigo/10 p-4 text-center konek-card-shadow"
        >
          <p className="font-bold text-indigo">
            {name}
          </p>
          <p className="text-xs text-indigo/50">
            Account →
          </p>
        </Link>
      ))}

      </div>

    </section>
  );
}
