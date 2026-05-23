"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, ExternalLink, Image, LineChart, Wallet } from "lucide-react";
import { CryptoPaymentCard } from "@/components/crypto-payment-card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { NetworkStatusCard } from "@/components/web3/NetworkStatusCard";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { NoMockDataGuard } from "@/components/dashboard/NoMockDataGuard";
import { RealMetricCard } from "@/components/dashboard/RealMetricCard";
import { RecentTransactionsTable } from "@/components/dashboard/RecentTransactionsTable";
import { WalletLinkPanel } from "@/components/account/WalletLinkPanel";
import { ExternalMarketplaceLinks } from "@/components/nft/ExternalMarketplaceLinks";
import { ListForSaleModal } from "@/components/nft/ListForSaleModal";
import { PlanStatusCard } from "@/components/subscription/PlanStatusCard";
import { api } from "@/lib/api";
import { formatWeiEth } from "@/lib/format/marketplace";
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

type OwnedNft = {
  _id: string;
  name: string;
  imageUrl?: string;
  imageGatewayUrl?: string;
  imageIpfsUri?: string;
  tokenId?: string;
  mintTxHash?: string;
  tokenNumber?: number;
  chainId?: number;
  contractAddress?: string;
  mintStatus?: string;
  rarityTier?: string;
  marketplaceListing?: { price: string; status: string };
};

function gatewayFromIpfs(ipfsUri: string | undefined, gateway: string) {
  if (!ipfsUri?.startsWith("ipfs://")) return undefined;
  return `${gateway.replace(/\/$/, "")}/${ipfsUri.replace("ipfs://", "").replace(/^\/+/, "")}`;
}

function dashboardNftImageCandidates(nft: OwnedNft) {
  return [
    nft.imageGatewayUrl,
    gatewayFromIpfs(nft.imageIpfsUri, "https://gateway.pinata.cloud/ipfs"),
    gatewayFromIpfs(nft.imageIpfsUri, "https://ipfs.io/ipfs"),
    nft.imageUrl
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<UserSummary>();
  const [chart, setChart] = useState<Array<{ _id: string; usd: number }>>([]);
  const [transactions, setTransactions] = useState<Array<{ paymentId: string; token: string; usdValueAtPayment?: number; status: string }>>([]);
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [listingNft, setListingNft] = useState<OwnedNft>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<UserSummary>("/api/dashboard/user/summary"),
      api<{ data: Array<{ _id: string; usd: number }> }>("/api/dashboard/earnings-chart?range=30d"),
      api<{ transactions: typeof transactions }>("/api/dashboard/transactions/recent"),
      api<{ nfts: OwnedNft[] }>("/api/dashboard/user/nfts")
    ]))
      .then(([nextSummary, nextChart, nextTransactions, nextNfts]) => {
        setSummary(nextSummary);
        setChart(nextChart.data);
        setTransactions(nextTransactions.transactions);
        setNfts(nextNfts.nfts);
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
              <section className="rounded-xl border border-white/10 bg-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase text-cyan">Owned NFTs</p>
                    <h2 className="mt-1 text-2xl font-black">Your On-chain Collection</h2>
                  </div>
                  <a className="inline-flex items-center gap-2 rounded-md border border-cyan/30 px-3 py-2 text-sm text-cyan hover:bg-cyan/10" href="/launchpad">
                    Explore Launchpad <ExternalLink size={14} />
                  </a>
                </div>
                {isLoading ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-white/5" />)}
                  </div>
                ) : !nfts.length ? (
                  <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-muted">No NFTs owned yet.</div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {nfts.map((nft) => (
                      <div key={nft._id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-cyan/40">
                        <DashboardNftImage nft={nft} />
                        <div className="p-3">
                          <p className="truncate font-bold">{nft.name}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                            <span>Token #{nft.tokenId ?? nft.tokenNumber ?? "?"}</span>
                            <span className="rounded-full border border-cyan/20 px-2 py-0.5 text-cyan">{nft.rarityTier ?? nft.mintStatus ?? "minted"}</span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <Link className="rounded-md border border-cyan/30 px-3 py-2 text-center text-xs font-bold text-cyan hover:bg-cyan/10" href={`/nft/${nft._id}`}>
                              View NFT
                            </Link>
                            {nft.marketplaceListing ? (
                              <Link className="rounded-md border border-lime/30 px-3 py-2 text-center text-xs font-bold text-lime hover:bg-lime/10" href={`/marketplace/assets/${nft.chainId}/${nft.contractAddress}/${nft.tokenId}`}>
                                Listed for {formatWeiEth(nft.marketplaceListing.price)}
                              </Link>
                            ) : (
                              <button
                                disabled={!nft.chainId || !nft.contractAddress || !nft.tokenId}
                                onClick={() => setListingNft(nft)}
                                className="rounded-md border border-white/10 px-3 py-2 text-center text-xs font-bold text-muted hover:text-white disabled:opacity-50"
                              >
                                List for Sale
                              </button>
                            )}
                          </div>
                          {nft.chainId ? (
                            <div className="mt-3">
                              <ExternalMarketplaceLinks chainId={nft.chainId} contractAddress={nft.contractAddress} tokenId={nft.tokenId} txHash={nft.mintTxHash} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <RecentTransactionsTable transactions={transactions} />
            </div>
            <div className="space-y-6">
              <PlanStatusCard />
              <WalletLinkPanel />
              <NetworkStatusCard />
              <CryptoPaymentCard />
            </div>
          </div>
        </section>
      </NoMockDataGuard>
      </AuthGuard>
      {listingNft && (
        <ListForSaleModal
          open={Boolean(listingNft)}
          onClose={() => setListingNft(undefined)}
          nft={listingNft}
          onListed={() => {
            setListingNft(undefined);
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}

function DashboardNftImage({ nft }: { nft: OwnedNft }) {
  const candidates = dashboardNftImageCandidates(nft);
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = candidates[imageIndex];

  return (
    <div className="aspect-square bg-black/40">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={nft.name}
          className="h-full w-full object-cover"
          onError={() => setImageIndex((current) => current + 1)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
      )}
    </div>
  );
}
