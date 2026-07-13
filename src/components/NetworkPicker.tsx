"use client";

import { ChipPicker } from "./ChipPicker";

const NETWORKS = [
  { id: "mtn", label: "MTN" },
  { id: "glo", label: "Glo" },
  { id: "airtel", label: "Airtel" },
  { id: "9mobile", label: "9mobile" },
];

export function NetworkPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (network: string) => void;
}) {
  return <ChipPicker options={NETWORKS} value={value} onChange={onChange} columns={4} />;
}
