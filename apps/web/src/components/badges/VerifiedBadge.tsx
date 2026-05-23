import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ compact = false, size = "sm", label = "Verified Creator" }: { compact?: boolean; size?: "sm" | "md"; label?: string }) {
  const iconSize = size === "md" ? 16 : 13;
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-400/15 font-black uppercase text-sky-200 shadow-[0_0_18px_rgba(56,189,248,.16)] ${size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}
    >
      <BadgeCheck size={iconSize} className="fill-sky-400/20 text-sky-300" />
      {!compact && <span>Verified</span>}
    </span>
  );
}
