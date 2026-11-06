"use client";

export interface ChipOption {
  id: string;
  label: string;
  // Optional visual badge (monogram, brand mark, icon) shown above the label.
  icon?: React.ReactNode;
}

export function ChipPicker({
  options,
  value,
  onChange,
  columns = 4,
}: {
  options: ChipOption[];
  value: string | null;
  onChange: (id: string) => void;
  columns?: number;
}) {
  const hasIcons = options.some((o) => o.icon);
  return (
    <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-xl border font-semibold transition-colors ${
            hasIcons ? "flex flex-col items-center gap-1.5 py-3 text-xs" : "py-3 text-sm"
          } ${
            value === o.id
              ? "border-raviion-green bg-raviion-green/10 text-indigo"
              : "border-indigo/20 text-indigo hover:bg-indigo/5"
          }`}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// A colored monogram badge, used where we don't have (or don't want) a real
// brand logo asset — e.g. bookmakers and gift-card brands.
export function MonogramBadge({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-bold text-white ${className}`}
    >
      {text}
    </span>
  );
}
