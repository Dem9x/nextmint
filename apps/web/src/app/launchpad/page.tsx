"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type LaunchCollection = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  chainId: number;
  coverImageUrl?: string;
  maxSupply: number;
  totalMinted: number;
  mintPrice: string;
  mintCurrency: string;
  status: string;
};

export default function LaunchpadPage() {
  const [collections, setCollections] = useState<LaunchCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(api<{ collections: LaunchCollection[] }>("/api/launchpad/collections"))
      .then((result) => setCollections(result.collections))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load launchpad"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-cyan">Public Mint Campaigns</p>
            <h1 className="mt-2 text-4xl font-black">NEXMINT Launchpad</h1>
          </div>
          <Link className="rounded-md border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/20" href="/collections/create">Launch Collection</Link>
        </div>
        {error && <p className="mt-5 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
        {isLoading ? <div className="mt-8 rounded-lg border border-white/10 bg-panel p-6 text-muted">Loading launchpad campaigns...</div> : null}
        {!isLoading && !collections.length ? (
          <div className="mt-8 rounded-lg border border-white/10 bg-panel p-8 text-center text-muted">No live collections yet. Be the first creator to launch.</div>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const progress = collection.maxSupply ? Math.min((collection.totalMinted / collection.maxSupply) * 100, 100) : 0;
            return (
              <Link key={collection._id} href={`/launchpad/${collection.slug}`} className="rounded-lg border border-white/10 bg-panel p-4 transition hover:border-cyan/40">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[linear-gradient(135deg,#172554,#0f172a_55%,#14532d)]">
                  {collection.coverImageUrl ? <img src={collection.coverImageUrl} alt={collection.name} className="h-full w-full object-cover" /> : <span className="text-sm text-muted">No cover image</span>}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{collection.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{collection.description ?? "Public mint campaign"}</p>
                  </div>
                  <ChainBadge chainId={collection.chainId} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan" style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex justify-between text-sm text-muted">
                  <span>{collection.totalMinted}/{collection.maxSupply} minted</span>
                  <span>{collection.mintPrice} {collection.mintCurrency}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
