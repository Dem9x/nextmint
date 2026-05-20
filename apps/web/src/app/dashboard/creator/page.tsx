"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, Boxes, ChartNoAxesColumn, Rocket } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { NoMockDataGuard } from "@/components/dashboard/NoMockDataGuard";
import { RealMetricCard } from "@/components/dashboard/RealMetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type CreatorSummary = {
  totalCollectionsLaunched: number;
  totalMintRevenueUsd: number;
  totalPlatformFeesUsd: number;
  totalCreatorEarningsUsd: number;
  availableEarningsUsd: number;
  pendingEarningsUsd: number;
  totalMints: number;
  topCollections: Array<{
    _id: string;
    name: string;
    slug: string;
    status: string;
    chainId: number;
    totalMinted?: number;
    maxSupply?: number;
  }>;
};

export default function CreatorDashboardPage() {
  const [summary, setSummary] = useState<CreatorSummary>();
  const [revenue, setRevenue] = useState<Array<{ _id: string; grossUsd?: number; platformUsd?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<CreatorSummary>("/api/dashboard/creator/summary"),
      api<{ data: Array<{ _id: string; grossUsd?: number; platformUsd?: number }> }>("/api/dashboard/revenue-chart?range=30d&chainId=all")
    ]))
      .then(([nextSummary, nextRevenue]) => {
        setSummary(nextSummary);
        setRevenue(nextRevenue.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load creator dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
        <NoMockDataGuard source="api">
          <section className="mx-auto max-w-7xl px-4 py-10">
            <p className="text-sm font-semibold uppercase text-cyan">Creator launchpad</p>
            <h1 className="mt-2 text-4xl font-black">Creator Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted">
              Real launchpad stats from verified public mint records, creator earnings, and platform revenue splits.
            </p>
            {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <RealMetricCard label="Published Collections" value={summary?.totalCollectionsLaunched} icon={Rocket} empty={isLoading || !summary} />
              <RealMetricCard label="Public Mints" value={summary?.totalMints} icon={Boxes} empty={isLoading || !summary} />
              <RealMetricCard label="Creator Earnings" value={summary ? `$${summary.totalCreatorEarningsUsd.toFixed(2)}` : undefined} icon={BadgeDollarSign} empty={isLoading || !summary} />
              <RealMetricCard label="Available Payout" value={summary ? `$${summary.availableEarningsUsd.toFixed(2)}` : undefined} icon={ChartNoAxesColumn} empty={isLoading || !summary} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="rounded-lg border border-white/10 bg-panel p-5">
                <h2 className="text-xl font-bold">Top Collections</h2>
                {!summary?.topCollections.length ? (
                  <EmptyStateCard title="No published collections yet" description="Create a collection, deploy it, pay the publish fee, then publish it to the launchpad." />
                ) : (
                  <div className="mt-4 space-y-3">
                    {summary.topCollections.map((collection) => (
                      <a
                        key={collection._id}
                        href={`/launchpad/${collection.slug}`}
                        className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan/40"
                      >
                        <div>
                          <p className="font-bold">{collection.name}</p>
                          <p className="text-xs uppercase text-muted">{collection.status} / chain {collection.chainId}</p>
                        </div>
                        <p className="text-sm text-cyan">{collection.totalMinted ?? 0}/{collection.maxSupply ?? 0} minted</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <RevenueChart data={revenue} />
            </div>
          </section>
        </NoMockDataGuard>
      </AuthGuard>
    </main>
  );
}
