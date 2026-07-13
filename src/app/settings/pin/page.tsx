"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PinPad } from "@/components/PinPad";

function SetPin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(finalConfirm: string) {
    if (finalConfirm !== pin) {
      setError("PINs didn't match — try again");
      setConfirmPin("");
      setStep("enter");
      setPin("");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(next);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-xs">
        <h1 className="font-heading text-xl font-bold text-indigo mb-1 text-center">
          {step === "enter" ? "Set a transaction PIN" : "Confirm your PIN"}
        </h1>
        <p className="text-sm text-indigo/60 mb-8 text-center">
          {step === "enter"
            ? "You'll use this to authorize purchases."
            : "Enter it once more to confirm."}
        </p>

        {step === "enter" ? (
          <PinPad
            value={pin}
            onChange={setPin}
            onComplete={() => setStep("confirm")}
          />
        ) : (
          <PinPad
            value={confirmPin}
            onChange={setConfirmPin}
            onComplete={submit}
          />
        )}

        {loading && <p className="mt-4 text-sm text-indigo/60 text-center">Saving…</p>}
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      </div>
    </main>
  );
}

export default function SetPinPage() {
  return (
    <Suspense>
      <SetPin />
    </Suspense>
  );
}
