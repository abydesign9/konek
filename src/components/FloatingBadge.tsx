// A small emoji-in-a-circle that bobs gently — the recurring "floating
// icon" motif used on the landing page and both auth screens. Each
// instance should get its own `delay` so a cluster doesn't move in
// lockstep (see the konek-float keyframe in globals.css).
export function FloatingBadge({
  icon,
  className,
  delay = 0,
  size = "md",
}: {
  icon: string;
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-16 text-2xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12 text-lg";
  return (
    <div
      className={`konek-float absolute z-10 flex ${dims} items-center justify-center rounded-full bg-white konek-card-shadow ${className ?? ""}`}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden
    >
      {icon}
    </div>
  );
}
