import { parseAvatar, initials } from "@/lib/avatars";

// Renders a user's avatar: a picked emoji preset on a soft tinted circle, a
// remote image (legacy/URL values), or an initials fallback. Fully self-contained
// for the emoji + initials cases (no network).
export function Avatar({
  value,
  name,
  size = 56,
  className = "",
}: {
  value?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const emoji = parseAvatar(value);
  const style = { width: size, height: size };

  if (emoji) {
    return (
      <span
        style={{ ...style, background: emoji.bg, fontSize: Math.round(size * 0.52) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full leading-none ${className}`}
        aria-hidden="true"
      >
        {emoji.emoji}
      </span>
    );
  }

  if (value && /^https?:\/\//.test(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt="Avatar"
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full bg-indigo/5 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo/10 font-heading font-bold text-indigo ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
