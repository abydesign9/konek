"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker } from "@/components/ChipPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { COUNTRIES, detectCountry, findCountry, type Country } from "@/lib/intl/carriers";

const PRESETS_USD_MINOR = [500, 1000, 2000, 5000]; // $5 / $10 / $20 / $50

function formatUsd(minor: number) {
  return `$${(minor / 100).toLocaleString()}`;
}

interface Beneficiary {
  id: string;
  label: string;
  details: { phone: string; network: string; countryCode?: string };
}

// recipient.network is stored as "<countryCode>:<carrierId>" so a saved
// beneficiary re-hydrates both the country and the carrier.
function encodeNetwork(countryCode: string, carrierId: string) {
  return `${countryCode}:${carrierId}`;
}

function BuyIntlTopup() {
  const router = useRouter();
  const params = useSearchParams();

  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [countryCode, setCountryCode] = useState<string>(() => {
    const net = params.get("network");
    if (net?.includes(":")) return net.split(":")[0];
    return detectCountry(params.get("phone") ?? "")?.code ?? "NG";
  });
  const [carrier, setCarrier] = useState<string | null>(() => {
    const net = params.get("network");
    return net?.includes(":") ? net.split(":")[1] : null;
  });
  const [manualCountry, setManualCountry] = useState(false);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const detected = useMemo(() => detectCountry(phone), [phone]);
  const country: Country = findCountry(countryCode) ?? COUNTRIES[0];

  useEffect(() => {
    fetch("/api/beneficiaries?serviceType=intl_topup")
      .then((res) => res.json())
      .then((data) => setBeneficiaries(data.beneficiaries ?? []));
  }, []);

  // Auto-follow the detected country as the user types, until they pick one
  // manually (then we respect their choice).
  useEffect(() => {
    if (!manualCountry && detected && detected.code !== countryCode) {
      setCountryCode(detected.code);
      setCarrier(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected]);

  function pickBeneficiary(b: Beneficiary) {
    setPhone(b.details.phone);
    setManualCountry(true);
    if (b.details.network?.includes(":")) {
      const [cc, car] = b.details.network.split(":");
      setCountryCode(cc);
      setCarrier(car);
    }
  }

  function proceedToPin() {
    if (!carrier || phone.length < 6 || !amountMinor) {
      setError("Enter a phone number, choose a carrier, and pick an amount");
      return;
    }
    setError(null);
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "intl_topup",
        network: encodeNetwork(country.code, carrier!),
        phone,
        amountMinor,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this purchase. No funds were charged.");
      setPin("");
      setShowPin(false);
      return;
    }

    const carrierName = country.carriers.find((c) => c.id === carrier)?.name ?? carrier;
    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${country.flag} ${carrierName} •••• ${phone.slice(-4)}`,
        serviceType: "intl_topup",
        details: { phone, network: encodeNetwork(country.code, carrier!), countryCode: country.code },
      }),
    });

    setSuccess(`${formatUsd(amountMinor ?? 0)} top-up delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {formatUsd(amountMinor ?? 0)} to {phone}
          </h1>
          <p className="text-sm text-indigo/60 mb-8 text-center">Enter your PIN to authorize.</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-sm text-indigo/60 text-center">Processing…</p>}
          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
          <button
            onClick={() => {
              setShowPin(false);
              setPin("");
            }}
            className="mt-6 text-sm text-indigo/60 underline block mx-auto"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="International top-up"
        backHref="/home"
        right={
          <Link href="/wallet/recurring" className="text-xs font-semibold text-indigo">
            Recurring
          </Link>
        }
      />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">
        Priced in USD, charged from your NGN wallet at today&apos;s rate.
      </p>

      {beneficiaries.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-indigo/60 mb-2">Family &amp; saved</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {beneficiaries.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => pickBeneficiary(b)}
                className="whitespace-nowrap rounded-full border border-indigo/20 px-4 py-2 text-sm font-medium text-indigo hover:bg-indigo/5"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm text-indigo/60 mb-2">Recipient phone number</label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 555 123 4567"
        className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-konek-green"
      />
      {detected && !manualCountry && (
        <p className="text-xs text-konek-green font-medium mb-4">
          Detected {detected.flag} {detected.name}
        </p>
      )}

      <label className="block text-sm text-indigo/60 mb-2">Country</label>
      <select
        value={countryCode}
        onChange={(e) => {
          setManualCountry(true);
          setCountryCode(e.target.value);
          setCarrier(null);
        }}
        className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3 text-base mb-6 focus:outline-none focus:ring-2 focus:ring-konek-green"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.dialCode})
          </option>
        ))}
      </select>

      <label className="block text-sm text-indigo/60 mb-2">Carrier</label>
      <ChipPicker
        options={country.carriers.map((c) => ({ id: c.id, label: c.name }))}
        value={carrier}
        onChange={setCarrier}
        columns={2}
      />

      <label className="block text-sm text-indigo/60 mb-2">Amount</label>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {PRESETS_USD_MINOR.map((minor) => (
          <button
            key={minor}
            type="button"
            onClick={() => setAmountMinor(minor)}
            className={`rounded-xl border py-4 font-semibold transition-colors ${
              amountMinor === minor
                ? "border-konek-green bg-konek-green/10 text-indigo"
                : "border-indigo/20 text-indigo hover:bg-indigo/5"
            }`}
          >
            {formatUsd(minor)}
          </button>
        ))}
      </div>

      <button onClick={proceedToPin} className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold">
        Buy top-up
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold">{success}</p>}
      </div>
    </main>
  );
}

export default function BuyIntlTopupPage() {
  return (
    <Suspense>
      <BuyIntlTopup />
    </Suspense>
  );
}
