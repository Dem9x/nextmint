import { EmptyStateCard } from "./EmptyStateCard";

export function RecentTransactionsTable({ transactions }: { transactions: Array<{ paymentId: string; token: string; usdValueAtPayment?: number; status: string }> }) {
  if (!transactions.length) return <EmptyStateCard title="Recent transactions" description="No verified or pending payments yet." />;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Recent Transactions</h3>
      <div className="mt-4 space-y-2 text-sm">
        {transactions.map((tx) => <div key={tx.paymentId} className="grid grid-cols-3 rounded-md bg-white/5 p-3"><span>{tx.paymentId}</span><span>{tx.token}</span><span>{tx.status}</span></div>)}
      </div>
    </div>
  );
}
