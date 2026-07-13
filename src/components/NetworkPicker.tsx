"use client";

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
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {NETWORKS.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onChange(n.id)}
          className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
            value === n.id
              ? "border-konek-green bg-konek-green/10 text-indigo"
              : "border-indigo/20 text-indigo hover:bg-indigo/5"
          }`}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}
