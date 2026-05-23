export function ProBadge({ compact = false, size = "sm" }: { compact?: boolean; size?: "sm" | "md" }) {
  return (
    <span
      title="Pro Creator"
      aria-label="Pro Creator"
      className={`inline-flex items-center rounded-full border border-pink-300/35 bg-gradient-to-r from-fuchsia-500/25 via-pink-500/20 to-violet-500/25 font-black uppercase tracking-[0.08em] text-pink-100 shadow-[0_0_18px_rgba(236,72,153,.16)] ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}
    >
      {compact ? "PRO" : "PRO"}
    </span>
  );
}
