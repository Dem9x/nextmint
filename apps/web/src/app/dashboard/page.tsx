"use client";

import { useEffect, useState } from "react";
import { Coins, Image, LineChart, Wallet } from "lucide-react";
import { CryptoPaymentCard } from "@/components/crypto-payment-card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { NetworkStatusCard } from "@/components/web3/NetworkStatusCard";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { NoMockDataGuard } from "@/components/dashboard/NoMockDataGuard";
import { RealMetricCard } from "@/components/dashboard/RealMetricCard";
import { RecentTransactionsTable } from "@/components/dashboard/RecentTransactionsTable";
import { PlanStatusCard } from "@/components/subscription/PlanStatusCard";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type UserSummary = {
  totalCollections: number;
  totalNFTsGenerated: number;
  totalMints: number;
  totalCredits: number;
  activeSubscription: unknown;
  totalSpentUsd: number;
  totalEarnedUsd: number;
  availablePayoutUsd: number;
  pendingPayoutUsd: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<UserSummary>();
  const [chart, setChart] = useState<Array<{ _id: string; usd: number }>>([]);
  const [transactions, setTransactions] = useState<Array<{ paymentId: string; token: string; usdValueAtPayment?: number; status: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<UserSummary>("/api/dashboard/user/summary"),
      api<{ data: Array<{ _id: string; usd: number }> }>("/api/dashboard/earnings-chart?range=30d"),
      api<{ transactions: typeof transactions }>("/api/dashboard/transactions/recent")
    ]))
      .then(([nextSummary, nextChart, nextTransactions]) => {
        setSummary(nextSummary);
        setChart(nextChart.data);
        setTransactions(nextTransactions.transactions);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
      <NoMockDataGuard source="api">
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="text-4xl font-black">Dashboard</h1>
          {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <RealMetricCard label="Credits" value={summary?.totalCredits} icon={Coins} empty={isLoading || !summary} />
            <RealMetricCard label="Collections" value={summary?.totalCollections} icon={Image} empty={isLoading || !summary} />
            <RealMetricCard label="Earned" value={summary ? `$${summary.totalEarnedUsd.toFixed(2)}` : undefined} icon={LineChart} empty={isLoading || !summary} />
            <RealMetricCard label="Mints" value={summary?.totalMints} icon={Wallet} empty={isLoading || !summary} />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <EarningsChart data={chart} />
              <RecentTransactionsTable transactions={transactions} />
            </div>
            <div className="space-y-6">
              <PlanStatusCard />
              <NetworkStatusCard />
              <CryptoPaymentCard />
            </div>
          </div>
        </section>
      </NoMockDataGuard>
      </AuthGuard>
    </main>
  );
}
