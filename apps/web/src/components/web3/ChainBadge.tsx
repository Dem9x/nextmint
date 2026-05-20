"use client";

import { getChainById, getChainMetadata } from "@/config/chains";

type ChainBadgeProps = {
  chainId?: number;
  className?: string;
  compact?: boolean;
};

export function ChainBadge({ chainId, className = "", compact = false }: ChainBadgeProps) {
  const chain = getChainById(chainId);
  const metadata = getChainMetadata(chainId);
  const label = metadata?.label ?? chain?.name ?? "Unsupported";
  const badgeClass = metadata?.badgeClass ?? "border-white/15 bg-white/10 text-white";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
      {compact ? metadata?.slug ?? label : label}
      <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
        Testnet
      </span>
    </span>
  );
}
