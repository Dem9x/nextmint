import { EmptyStateCard } from "./EmptyStateCard";

export function RevenueChart({ data }: { data: Array<{ _id: string; grossUsd?: number; platformUsd?: number }> }) {
  if (!data.length) return <EmptyStateCard title="Revenue chart" description="No verified revenue records yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Revenue</h3>
      <div className="mt-4 space-y-2 text-sm">
        {data.map((row) => <div key={row._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{row._id}</span><span>${Number(row.platformUsd ?? row.grossUsd ?? 0).toFixed(2)}</span></div>)}
      </div>
    </div>
  );
}
