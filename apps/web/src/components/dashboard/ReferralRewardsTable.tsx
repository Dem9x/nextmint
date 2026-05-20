import { EmptyStateCard } from "./EmptyStateCard";

export function ReferralRewardsTable({ rewards }: { rewards: Array<{ _id: string; rewardType: string; amountUsd?: number; creditsAmount?: number; status: string }> }) {
  if (!rewards.length) return <EmptyStateCard title="Referral rewards" description="No referral rewards have been earned yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Referral Rewards</h3>
      <div className="mt-4 space-y-2 text-sm">{rewards.map((item) => <div key={item._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{item.rewardType}</span><span>{item.creditsAmount ? `${item.creditsAmount} credits` : `$${Number(item.amountUsd ?? 0).toFixed(2)}`} {item.status}</span></div>)}</div>
    </div>
  );
}
