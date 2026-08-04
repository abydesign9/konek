"use client";

import { useEffect, useRef } from "react";

// Auto-submits via onComplete once `length` digits are entered — this is
// what makes a repeat purchase feel like "2 taps": tap Buy Again, then the
// PIN pad submits itself the instant the 4th digit lands.
export function PinPad({
  value,
  onChange,
  onComplete,
  length = 4,
  label = "Enter your PIN",
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (value.length === length) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete?.(value);
      }
    } else {
      firedRef.current = false;
    }
  }, [value, length, onComplete]);

  return (
    <div>
      <label className="block text-sm text-indigo/60 mb-2">{label}</label>
      <div
        className="flex gap-3 mb-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-xl border flex items-center justify-center text-xl font-bold ${
              i < value.length ? "border-konek-green bg-konek-green/10" : "border-indigo/20"
            }`}
          >
            {value[i] ? "•" : ""}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoFocus
        autoComplete="off"
        // Stop password managers (1Password, LastPass, Dashlane, browser saved
        // passwords) from offering to autofill this field. It's visually a
        // password-style dot mask but semantically a transaction PIN, not a
        // login password — an autofilled password would silently become 4
        // "digits" and auto-submit a wrong PIN via PinPad's onComplete.
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        name="konek-transaction-pin"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(digits);
        }}
        className="sr-only"
      />
    </div>
  );
}
