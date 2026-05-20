"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CreatorEarningsTable } from "@/components/dashboard/CreatorEarningsTable";
import { ReferralRewardsTable } from "@/components/dashboard/ReferralRewardsTable";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type EarnSummary = {
  referralCode: string;
  referralLink: string;
  creatorEarnings: Array<{ _id: string; sourceType: string; netAmountUsd: number; status: string }>;
  referralRewards: Array<{ _id: string; rewardType: string; amountUsd?: number; creditsAmount?: number; status: string }>;
  referrals: Array<unknown>;
  creditLedger: Array<{ _id: string; type: string; amount: number; balanceAfter: number }>;
};

export default function EarnPage() {
  const [summary, setSummary] = useState<EarnSummary>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(api<EarnSummary>("/api/earnings/summary"))
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load earnings"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-sm font-semibold uppercase text-cyan">Earn creator revenue</p>
        <h1 className="mt-2 text-4xl font-black">Earnings</h1>
        <div className="mt-4 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-sm text-yellow-100">
          Earnings depend on actual sales and platform rules. Rewards are not guaranteed. Bonus credits cannot be withdrawn.
        </div>
        {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <CreatorEarningsTable earnings={isLoading ? [] : summary?.creatorEarnings ?? []} />
          <ReferralRewardsTable rewards={isLoading ? [] : summary?.referralRewards ?? []} />
          <div className="rounded-lg border border-white/10 bg-panel p-5">
            <h3 className="font-bold">Referral Program</h3>
            {summary ? (
              <div className="mt-4 space-y-2 text-sm">
                <p>Code: <span className="text-cyan">{summary.referralCode}</span></p>
                <p>Link: <span className="text-cyan">{summary.referralLink}</span></p>
                <p>Invited users: {summary.referrals.length}</p>
              </div>
            ) : <EmptyStateCard title="Referral program" />}
          </div>
          <div className="rounded-lg border border-white/10 bg-panel p-5">
            <h3 className="font-bold">Platform Credits</h3>
            {!summary?.creditLedger.length ? <p className="mt-4 text-sm text-muted">No credit ledger entries yet.</p> : (
              <div className="mt-4 space-y-2 text-sm">{summary.creditLedger.map((row) => <div key={row._id} className="flex justify-between rounded-md bg-white/5 p-3"><span>{row.type}</span><span>{row.amount} / balance {row.balanceAfter}</span></div>)}</div>
            )}
          </div>
        </div>
      </section>
      </AuthGuard>
    </main>
  );
}
