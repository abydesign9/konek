"use client";

import { useState } from "react";

export default function BalanceVisibility({
  amount,
}: {
  amount: string;
}) {

  const [hidden, setHidden] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">

      <span>
        {hidden ? "••••••" : amount}
      </span>

      <button
        type="button"
        onClick={() => setHidden(!hidden)}
        className="text-xs"
        aria-label="Toggle balance"
      >
        {hidden ? "👁" : "🙈"}
      </button>

    </span>
  );
}
