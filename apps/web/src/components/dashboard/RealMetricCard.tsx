import type { LucideIcon } from "lucide-react";
import { EmptyStateCard } from "./EmptyStateCard";

export function RealMetricCard({ label, value, icon: Icon, empty }: { label: string; value: string | number | null | undefined; icon?: LucideIcon; empty?: boolean }) {
  if (empty) return <EmptyStateCard title={label} />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      {Icon && <Icon className="text-cyan" />}
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold">{value ?? "No data yet"}</p>
    </div>
  );
}
