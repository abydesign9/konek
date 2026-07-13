"use client";

export function ChipPicker({
  options,
  value,
  onChange,
  columns = 4,
}: {
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 mb-6`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
            value === o.id
              ? "border-konek-green bg-konek-green/10 text-indigo"
              : "border-indigo/20 text-indigo hover:bg-indigo/5"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
