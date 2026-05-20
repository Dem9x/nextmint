"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AIUsageStatsCard } from "@/components/dashboard/AIUsageStatsCard";
import { ChainRevenueBreakdown } from "@/components/dashboard/ChainRevenueBreakdown";
import { NoMockDataGuard } from "@/components/dashboard/NoMockDataGuard";
import { RealMetricCard } from "@/components/dashboard/RealMetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TreasuryBalanceCard } from "@/components/dashboard/TreasuryBalanceCard";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type AdminSummary = {
  totalUsers: number;
  activeUsers: number;
  totalCollections: number;
  totalMints: number;
  grossRevenueUsd: number;
  platformRevenueUsd: number;
  creatorPayoutsUsd: number;
  referralRewardsUsd: number;
  AIUsageCostUsd: number | null;
  treasuryBalances: Array<{ chainId: number; token: string; balanceToken: string; balanceUsd?: number | null }>;
  revenueByChain: Array<{ _id: number; usd: number; count: number }>;
  failedTransactions: number;
  pendingPayouts: number;
};

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary>();
  const [revenue, setRevenue] = useState<Array<{ _id: string; grossUsd?: number; platformUsd?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<AdminSummary>("/api/admin/dashboard/summary"),
      api<{ data: Array<{ _id: string; grossUsd?: number; platformUsd?: number }> }>("/api/dashboard/revenue-chart?range=30d&chainId=all")
    ]))
      .then(([nextSummary, nextRevenue]) => {
        setSummary(nextSummary);
        setRevenue(nextRevenue.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard adminOnly>
      <NoMockDataGuard source="api">
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="text-4xl font-black">Admin Revenue Dashboard</h1>
          {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <RealMetricCard label="Gross revenue" value={summary ? `$${summary.grossRevenueUsd.toFixed(2)}` : undefined} empty={isLoading || !summary} />
            <RealMetricCard label="Platform revenue" value={summary ? `$${summary.platformRevenueUsd.toFixed(2)}` : undefined} empty={isLoading || !summary} />
            <RealMetricCard label="Creator payouts" value={summary ? `$${summary.creatorPayoutsUsd.toFixed(2)}` : undefined} empty={isLoading || !summary} />
            <RealMetricCard label="Pending payouts" value={summary?.pendingPayouts} empty={isLoading || !summary} />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <RevenueChart data={revenue} />
            <TreasuryBalanceCard balances={summary?.treasuryBalances ?? []} />
            <ChainRevenueBreakdown rows={summary?.revenueByChain ?? []} />
            <AIUsageStatsCard costUsd={summary?.AIUsageCostUsd ?? null} />
          </div>
        </section>
      </NoMockDataGuard>
      </AuthGuard>
    </main>
  );
}
