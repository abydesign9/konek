"use client";

import { useEffect, useState } from "react";

// A "type any amount" naira field that sits alongside preset chips. Selecting a
// preset elsewhere clears this field; typing here deselects the presets (both
// write to the same amountMinor via onChange). Amount is kept in minor units.
interface Props {
  value: number | null;
  onChange: (minor: number | null) => void;
  presets: number[];
  minMinor?: number;
  maxMinor?: number;
}

export function CustomAmountField({
  value,
  onChange,
  presets,
  minMinor = 5000, // ₦50
  maxMinor = 50_000_000, // ₦500,000
}: Props) {
  const [text, setText] = useState(
    value !== null && !presets.includes(value) ? String(value / 100) : ""
  );
  const [error, setError] = useState<string | null>(null);

  // When a preset chip is picked (or the amount is cleared) elsewhere, empty the
  // custom field so the two inputs never look simultaneously active.
  useEffect(() => {
    if (value === null || presets.includes(value)) {
      setText("");
      setError(null);
    }
  }, [value, presets]);

  function handle(raw: string) {
    // Digits only — no floats, no separators.
    const cleaned = raw.replace(/[^\d]/g, "");
    setText(cleaned);

    if (cleaned === "") {
      setError(null);
      onChange(null);
      return;
    }
    const minor = Number(cleaned) * 100;
    if (minor < minMinor) {
      setError(`Minimum ₦${(minMinor / 100).toLocaleString()}`);
      onChange(null);
      return;
    }
    if (minor > maxMinor) {
      setError(`Maximum ₦${(maxMinor / 100).toLocaleString()}`);
      onChange(null);
      return;
    }
    setError(null);
    onChange(minor);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center rounded-2xl border border-indigo/15 bg-white px-4 py-3 raviion-card-shadow focus-within:ring-2 focus-within:ring-raviion-green">
        <span className="mr-1 font-heading text-lg font-bold text-indigo/50">₦</span>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => handle(e.target.value)}
          placeholder="Enter another amount"
          aria-label="Custom amount in naira"
          className="w-full bg-transparent font-heading text-lg font-bold text-indigo placeholder:text-sm placeholder:font-medium placeholder:text-indigo/40 focus:outline-none"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
