import { EmptyStateCard } from "./EmptyStateCard";

export function CreatorEarningsTable({ earnings }: { earnings: Array<{ _id: string; sourceType: string; netAmountUsd: number; status: string }> }) {
  if (!earnings.length) return <EmptyStateCard title="Creator earnings" description="No creator revenue has been recorded yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Creator Earnings</h3>
      <div className="mt-4 space-y-2 text-sm">{earnings.map((item) => <div key={item._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{item.sourceType}</span><span>${item.netAmountUsd.toFixed(2)} {item.status}</span></div>)}</div>
    </div>
  );
}
