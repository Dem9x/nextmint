import { EmptyStateCard } from "./EmptyStateCard";

export function ChainRevenueBreakdown({ rows }: { rows: Array<{ _id: number; usd: number; count: number }> }) {
  if (!rows.length) return <EmptyStateCard title="Revenue by chain" description="No chain revenue records yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Revenue by Chain</h3>
      <div className="mt-4 space-y-2 text-sm">{rows.map((row) => <div key={row._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{row._id}</span><span>${row.usd.toFixed(2)} / {row.count} tx</span></div>)}</div>
    </div>
  );
}
