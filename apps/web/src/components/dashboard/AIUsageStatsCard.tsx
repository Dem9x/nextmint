import { EmptyStateCard } from "./EmptyStateCard";

export function AIUsageStatsCard({ costUsd }: { costUsd: number | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <p className="text-sm text-muted">Estimated AI provider cost</p>
      <p className="mt-3 text-2xl font-bold">{costUsd == null ? "cost unavailable" : `$${costUsd.toFixed(2)}`}</p>
    </div>
  );
}
