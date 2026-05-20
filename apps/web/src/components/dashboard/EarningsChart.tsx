import { EmptyStateCard } from "./EmptyStateCard";

export function EarningsChart({ data }: { data: Array<{ _id: string; usd?: number }> }) {
  if (!data.length) return <EmptyStateCard title="Earnings chart" description="No creator earnings yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Earnings</h3>
      <div className="mt-4 space-y-2 text-sm">
        {data.map((row) => <div key={row._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{row._id}</span><span>${Number(row.usd ?? 0).toFixed(2)}</span></div>)}
      </div>
    </div>
  );
}
