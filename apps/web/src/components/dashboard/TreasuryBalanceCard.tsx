import { EmptyStateCard } from "./EmptyStateCard";

export function TreasuryBalanceCard({ balances }: { balances: Array<{ chainId: number; token: string; balanceToken: string; balanceUsd?: number | null }> }) {
  if (!balances.length) return <EmptyStateCard title="Treasury balances" description="Run treasury sync after configuring contracts." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Treasury Balances</h3>
      <div className="mt-4 space-y-2 text-sm">
        {balances.map((balance) => (
          <div key={`${balance.chainId}-${balance.token}`} className="flex justify-between rounded-md bg-white/5 p-3">
            <span>{balance.chainId} / {balance.token}</span>
            <span>{balance.balanceToken} {balance.balanceUsd == null ? "(USD unavailable)" : `$${balance.balanceUsd.toFixed(2)}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
