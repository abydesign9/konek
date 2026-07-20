"use client";

type Currency = "USD" | "GBP" | "EUR";

interface CurrencySliderProps {
  selected: Currency;
  onChange: (currency: Currency) => void;
}

const currencies = [
  {
    code: "USD" as Currency,
    flag: "🇺🇸",
    name: "US Dollar",
  },
  {
    code: "GBP" as Currency,
    flag: "🇬🇧",
    name: "British Pound",
  },
  {
    code: "EUR" as Currency,
    flag: "🇪🇺",
    name: "Euro",
  },
];

export default function CurrencySlider({
  selected,
  onChange,
}: CurrencySliderProps) {

  return (
    <div className="flex gap-3 overflow-x-auto py-2">

      {currencies.map((currency) => (

        <button
          key={currency.code}
          type="button"
          onClick={() => onChange(currency.code)}
          className={`flex-shrink-0 w-24 h-20 rounded-xl flex flex-col items-center justify-center font-semibold text-sm transition ${
            selected === currency.code
              ? "bg-indigo text-white"
              : "bg-indigo/10 text-indigo"
          }`}
        >

          <span className="text-2xl">
            {currency.flag}
          </span>

          <span>
            {currency.code}
          </span>

        </button>

      ))}

    </div>
  );
}
