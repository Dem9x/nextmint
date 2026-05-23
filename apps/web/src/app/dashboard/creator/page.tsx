"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, Boxes, ChartNoAxesColumn, Copy, ExternalLink, Rocket, Sparkles, Wallet } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { NoMockDataGuard } from "@/components/dashboard/NoMockDataGuard";
import { RealMetricCard } from "@/components/dashboard/RealMetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CreatorEarningsTable } from "@/components/dashboard/CreatorEarningsTable";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type CreatorSummary = {
  creator: {
    id: string;
    displayName: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
    walletAddress?: string;
    plan?: string;
    credits?: number;
    createdAt?: string;
  } | null;
  totalCollectionsLaunched: number;
  totalMintRevenueUsd: number;
  totalPlatformFeesUsd: number;
  totalCreatorEarningsUsd: number;
  availableEarningsUsd: number;
  pendingEarningsUsd: number;
  requestedPayoutUsd?: number;
  totalMints: number;
  topCollections: Array<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    status: string;
    chainId: number;
    totalMinted?: number;
    maxSupply?: number;
    coverImageUrl?: string;
    bannerImageUrl?: string;
    profileImageUrl?: string;
    mintPrice?: string;
    contractAddress?: string;
  }>;
  recentEarnings: Array<{ _id: string; sourceType: string; netAmountUsd: number; status: string; createdAt?: string }>;
};

export default function CreatorDashboardPage() {
  const [summary, setSummary] = useState<CreatorSummary>();
  const [revenue, setRevenue] = useState<Array<{ _id: string; usd?: number; grossUsd?: number; platformUsd?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<CreatorSummary>("/api/dashboard/creator/summary"),
      api<{ data: Array<{ _id: string; usd?: number; grossUsd?: number; platformUsd?: number }> }>("/api/dashboard/earnings-chart?range=30d")
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
            {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,229,255,0.16),rgba(8,11,18,0.92)_42%,rgba(132,255,80,0.10))] p-6 shadow-2xl shadow-cyan/10">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan/30 bg-black/40 shadow-[0_0_32px_rgba(0,229,255,0.18)]">
                    {summary?.creator?.avatarUrl ? <img src={summary.creator.avatarUrl} alt={summary.creator.displayName} className="h-full w-full object-cover" /> : <Sparkles className="text-cyan" size={34} />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">Creator command center</p>
                    <h1 className="mt-2 text-4xl font-black">{summary?.creator?.displayName ?? "Creator Dashboard"}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 uppercase">{summary?.creator?.plan ?? "free"} plan</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{summary?.creator?.credits ?? 0} credits</span>
                      {summary?.creator?.walletAddress && <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-cyan"><Wallet size={14} className="mr-1 inline" />{short(summary.creator.walletAddress)}</span>}
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
                      Real creator revenue from verified mint records, creator earnings, and payout states. No fake revenue, no mock mint totals.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/studio/collection" className="rounded-lg bg-cyan px-4 py-3 text-sm font-black text-black hover:bg-cyan/90">Create Collection</Link>
                  <Link href="/earn" className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold hover:bg-white/10">Payouts</Link>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <RealMetricCard label="Published Collections" value={summary?.totalCollectionsLaunched} icon={Rocket} empty={isLoading || !summary} />
              <RealMetricCard label="Public Mints" value={summary?.totalMints} icon={Boxes} empty={isLoading || !summary} />
              <RealMetricCard label="Creator Earnings" value={summary ? `$${summary.totalCreatorEarningsUsd.toFixed(2)}` : undefined} icon={BadgeDollarSign} empty={isLoading || !summary} />
              <RealMetricCard label="Available Payout" value={summary ? `$${summary.availableEarningsUsd.toFixed(2)}` : undefined} icon={ChartNoAxesColumn} empty={isLoading || !summary} />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <CreatorMiniStat label="Pending Earnings" value={`$${(summary?.pendingEarningsUsd ?? 0).toFixed(2)}`} />
              <CreatorMiniStat label="Requested Payouts" value={`$${(summary?.requestedPayoutUsd ?? 0).toFixed(2)}`} />
              <CreatorMiniStat label="Gross Creator Revenue" value={`$${(summary?.totalMintRevenueUsd ?? 0).toFixed(2)}`} />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-2xl border border-white/10 bg-panel/95 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan">Launch portfolio</p>
                    <h2 className="mt-1 text-2xl font-black">Creator Collections</h2>
                  </div>
                  <Link href="/collections/create" className="rounded-md border border-cyan/30 px-3 py-2 text-sm text-cyan hover:bg-cyan/10">New</Link>
                </div>
                {!summary?.topCollections.length ? (
                  <EmptyStateCard title="No published collections yet" description="Create a collection, deploy it, pay the publish fee, then publish it to the launchpad." />
                ) : (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {summary.topCollections.map((collection) => (
                      <Link
                        key={collection._id}
                        href={`/launchpad/${collection.slug}`}
                        className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-xl hover:shadow-cyan/5"
                      >
                        <div className="h-28 bg-gradient-to-br from-cyan/20 via-slate-900 to-lime/10">
                          {(collection.bannerImageUrl || collection.coverImageUrl) && <img src={collection.bannerImageUrl ?? collection.coverImageUrl} alt={collection.name} className="h-full w-full object-cover opacity-80 transition group-hover:scale-105" />}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black">{collection.name}</p>
                              <p className="mt-1 text-xs uppercase text-muted">{collection.status} · chain {collection.chainId}</p>
                            </div>
                            <ExternalLink className="text-muted group-hover:text-cyan" size={16} />
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-muted">{collection.description || "No collection description yet."}</p>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <StatPill label="Minted" value={`${collection.totalMinted ?? 0}/${collection.maxSupply ?? 0}`} />
                            <StatPill label="Price" value={`${collection.mintPrice ?? "0"} ETH`} />
                            <StatPill label="Contract" value={collection.contractAddress ? short(collection.contractAddress) : "none"} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <RevenueChart data={revenue.map((row) => ({ ...row, grossUsd: row.usd ?? row.grossUsd }))} />
                <CreatorEarningsTable earnings={summary?.recentEarnings ?? []} />
                <div className="rounded-2xl border border-white/10 bg-panel p-5">
                  <h3 className="font-black">Creator Profile</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <ProfileRow label="Name" value={summary?.creator?.displayName} />
                    <ProfileRow label="Email" value={summary?.creator?.email} />
                    <ProfileRow label="Wallet" value={summary?.creator?.walletAddress ? short(summary.creator.walletAddress) : undefined} copyValue={summary?.creator?.walletAddress} />
                    <ProfileRow label="Plan" value={summary?.creator?.plan?.toUpperCase()} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </NoMockDataGuard>
      </AuthGuard>
    </main>
  );
}

function short(value?: string) {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function CreatorMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className="mt-1 truncate font-bold text-white">{value}</p>
    </div>
  );
}

function ProfileRow({ label, value, copyValue }: { label: string; value?: string; copyValue?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 font-semibold">
        {value ?? "-"}
        {copyValue && <button onClick={() => navigator.clipboard.writeText(copyValue)} className="text-cyan hover:text-white"><Copy size={14} /></button>}
      </span>
    </div>
  );
}
