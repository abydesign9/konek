"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { COUNTRIES, detectCountry, findCountry, type Country } from "@/lib/intl/carriers";

interface PlanMeta {
  dataMb?: number;
  validityDays?: number;
  place?: string;
}
interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string; // country code the bundle is for
  price_minor: string;
  currency: string;
  meta: PlanMeta | null;
}

interface Beneficiary {
  id: string;
  label: string;
  details: { phone: string; network?: string; countryCode?: string };
}

function usd(minor: number) {
  return `$${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function dataLabel(mb?: number) {
  if (!mb) return "";
  return mb >= 1024 ? `${(mb / 1024).toLocaleString()} GB` : `${mb} MB`;
}

function BuyDataTopup() {
  const router = useRouter();
  const params = useSearchParams();

  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [manualCountry, setManualCountry] = useState(false);
  const [countryCode, setCountryCode] = useState<string>(
    () => detectCountry(params.get("phone") ?? "")?.code ?? "NG"
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const detected = useMemo(() => detectCountry(phone), [phone]);
  const country: Country = findCountry(countryCode) ?? COUNTRIES[0];

  useEffect(() => {
    fetch(`/api/catalog?serviceType=intl_data`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    fetch("/api/beneficiaries?serviceType=intl_data")
      .then((res) => res.json())
      .then((data) => setBeneficiaries(data.beneficiaries ?? []))
      .catch(() => setBeneficiaries([]));
  }, []);

  // A detected country auto-selects unless the user overrode it manually.
  useEffect(() => {
    if (!manualCountry && detected) setCountryCode(detected.code);
  }, [detected, manualCountry]);

  const visiblePlans = useMemo(
    () => plans.filter((p) => p.network === countryCode),
    [plans, countryCode]
  );

  function pickBeneficiary(b: Beneficiary) {
    setPhone(b.details.phone);
    if (b.details.countryCode) {
      setManualCountry(true);
      setCountryCode(b.details.countryCode);
    }
    setSelectedPlan(null);
  }

  function proceedToPin() {
    if (phone.trim().length < 6) {
      setError("Enter the recipient's phone number");
      return;
    }
    if (!selectedPlan) {
      setError("Choose a data bundle");
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
        serviceType: "intl_data",
        network: countryCode,
        phone,
        planExternalId: selectedPlan!.external_id,
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
    if (redirectIfKycGate(res, data)) return;
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

    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${country.flag} Data •••• ${phone.slice(-4)}`,
        serviceType: "intl_data",
        details: { phone, countryCode: country.code },
      }),
    }).catch(() => {});

    setSuccess(`${selectedPlan?.name} delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-1">Data sent 🎉</h1>
        <p className="text-indigo/60">{success}</p>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {selectedPlan?.name}
          </h1>
          <p className="text-sm text-indigo/60 mb-8 text-center">
            Charged in naira at today&rsquo;s rate. Enter your PIN to authorize.
          </p>
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
      <PageHeader title="Data top-up" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-indigo/60 mb-6">
          Send a mobile data bundle to any number abroad. Priced in USD, charged from your NGN wallet
          at today&apos;s rate.
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
          className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-raviion-green"
        />
        {detected && !manualCountry && (
          <p className="text-xs text-raviion-green font-medium mb-4">
            Detected {detected.flag} {detected.name}
          </p>
        )}

        <label className="block text-sm text-indigo/60 mb-2">Country</label>
        <select
          value={countryCode}
          onChange={(e) => {
            setManualCountry(true);
            setCountryCode(e.target.value);
            setSelectedPlan(null);
          }}
          className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3 text-base mb-6 focus:outline-none focus:ring-2 focus:ring-raviion-green"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.dialCode})
            </option>
          ))}
        </select>

        <label className="block text-sm text-indigo/60 mb-2">Data bundle</label>
        {visiblePlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-indigo/20 px-4 py-6 text-center text-sm text-indigo/50">
            No data bundles available for {country.flag} {country.name} yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visiblePlans.map((p) => {
              const active = selectedPlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-raviion-green bg-raviion-green/10"
                      : "border-indigo/15 hover:border-indigo/30"
                  }`}
                >
                  <p className="font-heading text-sm font-bold text-indigo">
                    {dataLabel(p.meta?.dataMb) || p.name}
                  </p>
                  {p.meta?.validityDays ? (
                    <p className="text-xs text-indigo/55">{p.meta.validityDays} days</p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold text-raviion-green">{usd(Number(p.price_minor))}</p>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={proceedToPin}
          disabled={!selectedPlan}
          className="mt-8 w-full rounded-xl bg-indigo px-6 py-3.5 text-center font-semibold text-white disabled:opacity-40"
        >
          Continue
        </button>
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}

        <p className="mt-6 text-center text-xs text-indigo/40">
          <Link href="/buy/intl-topup" className="underline">
            Need airtime instead? International top-up →
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <BuyDataTopup />
    </Suspense>
  );
}
