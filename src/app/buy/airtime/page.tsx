"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NetworkPicker } from "@/components/NetworkPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { IconAirtime, SERVICE_COLORS, NETWORK_COLORS } from "@/components/icons";

const PRESETS_MINOR = [50000, 100000, 200000, 500000]; // ₦500 / ₦1,000 / ₦2,000 / ₦5,000

interface Beneficiary {
  id: string;
  label: string;
  details: { phone: string; network: string };
}

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

function BuyAirtime() {
  const router = useRouter();
  const params = useSearchParams();

  const [network, setNetwork] = useState<string | null>(params.get("network"));
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [amountMinor, setAmountMinor] = useState<number | null>(
    params.get("amountMinor") ? Number(params.get("amountMinor")) : null
  );
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const airtimeColor = SERVICE_COLORS.airtime;

  useEffect(() => {
    fetch("/api/beneficiaries?serviceType=airtime")
      .then((res) => res.json())
      .then((data) => setBeneficiaries(data.beneficiaries ?? []));
  }, []);

  function pickBeneficiary(b: Beneficiary) {
    setNetwork(b.details.network);
    setPhone(b.details.phone);
  }

  function proceedToPin() {
    if (!network || phone.length < 10 || !amountMinor) {
      setError("Choose a network, enter a phone number, and pick an amount");
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
        serviceType: "airtime",
        network,
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

    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${network} •••• ${phone.slice(-4)}`,
        serviceType: "airtime",
        details: { phone, network },
      }),
    });

    setSuccess(`₦${((amountMinor ?? 0) / 100).toLocaleString()} airtime delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center konek-card-shadow mx-auto mb-5"
            style={{ backgroundColor: airtimeColor.bg }}
          >
            <IconAirtime className="w-7 h-7" style={{ color: airtimeColor.fg }} />
          </div>
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {formatNaira(amountMinor ?? 0)} to {phone}
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
            className="mt-6 text-sm text-indigo/60 underline block mx-auto konek-tile"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Buy airtime" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center konek-card-shadow shrink-0"
          style={{ backgroundColor: airtimeColor.bg }}
        >
          <IconAirtime className="w-6 h-6" style={{ color: airtimeColor.fg }} />
        </div>
        <p className="text-sm text-indigo/60">Instant top-up, any Nigerian network.</p>
      </div>

      {/* ---------- Buy again ---------- */}
      {beneficiaries.length > 0 && (
        <div className="mt-6 mb-2">
          <p className="text-sm font-semibold text-indigo mb-3">Buy again</p>
          <div className="flex gap-3 overflow-x-auto konek-scrollbar-none pb-1">
            {beneficiaries.map((b) => {
              const net = NETWORK_COLORS[b.details.network?.toLowerCase() || ""] ?? {
                bg: "#E6F0FF",
                fg: "#22315C",
                label: b.details.network ?? "",
              };
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBeneficiary(b)}
                  className="whitespace-nowrap rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile flex items-center gap-3"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: net.bg, color: net.fg }}
                  >
                    {net.label ? net.label.slice(0, 2) : "?"}
                  </span>
                  <span className="text-sm font-semibold text-indigo">{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- Network ---------- */}
      <section className="mt-7">
        <p className="text-sm font-semibold text-indigo mb-3">Network</p>
        <div className="rounded-2xl bg-white konek-card-shadow p-3">
          <NetworkPicker value={network} onChange={setNetwork} />
        </div>
      </section>

      {/* ---------- Phone number ---------- */}
      <section className="mt-6">
        <label className="block text-sm font-semibold text-indigo mb-3">Phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="080..."
          className="w-full rounded-2xl bg-white konek-card-shadow border border-transparent px-4 py-3.5 text-base text-indigo focus:outline-none focus:ring-2 focus:ring-konek-green"
        />
      </section>

      {/* ---------- Amount ---------- */}
      <section className="mt-6">
        <label className="block text-sm font-semibold text-indigo mb-3">Amount</label>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS_MINOR.map((minor) => {
            const active = amountMinor === minor;
            return (
              <button
                key={minor}
                type="button"
                onClick={() => setAmountMinor(minor)}
                className={`rounded-2xl py-4 font-heading font-bold text-lg konek-tile transition-colors ${
                  active
                    ? "konek-card-shadow text-white"
                    : "bg-white konek-card-shadow text-indigo"
                }`}
                style={active ? { backgroundColor: airtimeColor.fg } : undefined}
              >
                {formatNaira(minor)}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <button
        onClick={proceedToPin}
        className="w-full mt-8 rounded-2xl bg-indigo text-white py-4 font-heading font-bold text-base konek-card-shadow konek-tile"
      >
        Buy airtime
      </button>

      {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold text-center">{success}</p>}
      </div>
    </main>
  );
}

export default function BuyAirtimePage() {
  return (
    <Suspense>
      <BuyAirtime />
    </Suspense>
  );
}
