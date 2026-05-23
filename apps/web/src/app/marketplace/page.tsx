"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Layers, Search, Store } from "lucide-react";
import { CreatorBadges } from "@/components/badges/CreatorBadges";
import { ActivityFeedItem, MarketplaceBadge, MarketplaceEmptyState, MarketplaceStat, NftListingCard } from "@/components/marketplace/MarketplacePrimitives";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { activityLabel, formatWeiEth, shortAddress } from "@/lib/format/marketplace";

type Listing = {
  _id: string;
  chainId: number;
  nftContract: string;
  tokenId: string;
  seller: string;
  price: string;
  currency: string;
  status: string;
  collectionId?: string | { _id: string; name?: string; slug?: string };
  nftItemId?: { name?: string; imageUrl?: string; imageIpfsUri?: string };
  asset?: { name?: string; imageUrl?: string; imageIpfsUri?: string; collectionName?: string; isVerifiedCreator?: boolean; isVerifiedCollection?: boolean; isProCreator?: boolean };
};

type MarketStats = {
  totalVolume: string;
  totalSales: number;
  activeListings: number;
  listedCollections: number;
};

type TopCollection = {
  collectionId?: string;
  name?: string;
  slug?: string;
  contractAddress?: string;
  chainId: number;
  floorPrice: string | null;
  totalVolume: string;
  totalSales: number;
  activeListings: number;
  coverImageUrl?: string;
  isVerifiedCreator?: boolean;
  isVerifiedCollection?: boolean;
  isProCreator?: boolean;
};

type MarketActivity = {
  _id: string;
  type: string;
  wallet: string;
  price?: string;
  txHash: string;
  timestamp: string;
  nftItemId?: { name?: string; imageUrl?: string; imageIpfsUri?: string };
  asset?: { name?: string; imageUrl?: string; imageIpfsUri?: string };
};

type TrendingNft = {
  _id: string;
  name?: string;
  imageUrl?: string;
  imageIpfsUri?: string;
  chainId?: number;
  contractAddress?: string;
  tokenId?: string;
  likeCount?: number;
  collectionId?: { name?: string };
};

function ipfsToGateway(ipfsUri?: string) {
  return ipfsUri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${ipfsUri.replace("ipfs://", "")}` : undefined;
}

export default function MarketplacePage() {
  const [stats, setStats] = useState<MarketStats>();
  const [topCollections, setTopCollections] = useState<TopCollection[]>([]);
  const [activity, setActivity] = useState<MarketActivity[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [trendingCollections, setTrendingCollections] = useState<TopCollection[]>([]);
  const [trendingNfts, setTrendingNfts] = useState<TrendingNft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const singleNftListings = listings.filter((listing) => !listing.collectionId);
  const collectionListings = listings.filter((listing) => Boolean(listing.collectionId));

  useEffect(() => {
    Promise.all([
      api<MarketStats>("/api/marketplace/stats"),
      api<{ collections: TopCollection[] }>("/api/marketplace/collections/top?limit=6"),
      api<{ collections: TopCollection[] }>("/api/discovery/trending/collections?limit=6"),
      api<{ nfts: TrendingNft[] }>("/api/discovery/trending/nfts?limit=6"),
      api<{ activity: MarketActivity[] }>("/api/marketplace/activity/recent?limit=10"),
      api<{ listings: Listing[] }>("/api/marketplace/listings?limit=24")
    ])
      .then(([nextStats, nextTop, nextTrendingCollections, nextTrendingNfts, nextActivity, nextListings]) => {
        setStats(nextStats);
        setTopCollections(nextTop.collections);
        setTrendingCollections(nextTrendingCollections.collections);
        setTrendingNfts(nextTrendingNfts.nfts);
        setActivity(nextActivity.activity);
        setListings(nextListings.listings);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load marketplace"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.22),transparent_34%),linear-gradient(135deg,rgba(12,18,30,.98),rgba(5,6,8,.92))] p-8 shadow-[0_30px_80px_rgba(0,0,0,.35)]">
          <MarketplaceBadge tone="cyan"><Store size={13} /> Testnet Marketplace</MarketplaceBadge>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">Trade AI-native NFTs minted on NEXMINT.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
                Browse fixed-price listings across single NFTs and launchpad collections. Every trade state comes from verified on-chain marketplace events.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted">
                <Search size={16} />
                Search by NFT, collection, or token ID
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MarketplaceBadge>Offers soon</MarketplaceBadge>
                <MarketplaceBadge>Auctions soon</MarketplaceBadge>
                <MarketplaceBadge tone="lime">Buy now live</MarketplaceBadge>
                <MarketplaceBadge tone="cyan">Native ETH</MarketplaceBadge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MarketplaceStat label="Total Volume" value={formatWeiEth(stats?.totalVolume)} />
          <MarketplaceStat label="Total Sales" value={stats?.totalSales ?? 0} />
          <MarketplaceStat label="Active Listings" value={stats?.activeListings ?? 0} />
          <MarketplaceStat label="Listed Collections" value={stats?.listedCollections ?? 0} />
        </div>

        {error && <p className="mt-5 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}

        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="text-cyan" size={20} />
              <h2 className="text-2xl font-black">Top Collections</h2>
            </div>
            <span className="text-xs text-muted">Ranked by verified NEXMINT volume</span>
          </div>
          {isLoading ? <SkeletonGrid /> : topCollections.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {topCollections.map((collection) => (
                <Link
                  key={collection.collectionId ?? `${collection.chainId}-${collection.contractAddress}`}
                  href={collection.collectionId ? `/marketplace/collections/${collection.collectionId}` : "/marketplace"}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-panel transition hover:-translate-y-0.5 hover:border-cyan/40"
                >
                  <div className="relative aspect-[16/7] bg-black/40">
                    {collection.coverImageUrl ? <img src={collection.coverImageUrl} alt={collection.name ?? "Collection"} className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.03]" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-lg font-black">{collection.name ?? "Collection"}</p>
                        <CreatorBadges isVerifiedCreator={collection.isVerifiedCreator} isVerifiedCollection={collection.isVerifiedCollection} isProCreator={collection.isProCreator} />
                      </div>
                      <MarketplaceBadge tone={collection.activeListings > 0 ? "lime" : "neutral"}>{collection.activeListings} listed</MarketplaceBadge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Mini label="Floor" value={formatWeiEth(collection.floorPrice)} />
                      <Mini label="Volume" value={formatWeiEth(collection.totalVolume)} />
                      <Mini label="Sales" value={collection.totalSales} />
                      <Mini label="View" value="Collection" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : <MarketplaceEmptyState title="No traded collections yet." description="Collection rankings appear after verified marketplace sales." />}
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Trending Now</h2>
            <span className="text-xs text-muted">Simple V1 ranking from likes, views, sales, and listings</span>
          </div>
          {isLoading ? <SkeletonGrid /> : trendingCollections.length || trendingNfts.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-panel p-5">
                <h3 className="font-black">Trending Collections</h3>
                <div className="mt-4 space-y-3">
                  {trendingCollections.slice(0, 4).map((collection) => (
                    <Link key={collection.collectionId ?? collection.contractAddress} href={collection.collectionId ? `/marketplace/collections/${collection.collectionId}` : "/marketplace"} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-cyan/30">
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-black/40">{collection.coverImageUrl ? <img src={collection.coverImageUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-bold">{collection.name ?? "Collection"}</p>
                          <CreatorBadges isVerifiedCreator={collection.isVerifiedCreator} isVerifiedCollection={collection.isVerifiedCollection} isProCreator={collection.isProCreator} />
                        </div>
                        <p className="text-xs text-muted">Floor {formatWeiEth(collection.floorPrice)} · Volume {formatWeiEth(collection.totalVolume)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-panel p-5">
                <h3 className="font-black">Trending NFTs</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {trendingNfts.slice(0, 4).map((nft) => {
                    const image = nft.imageUrl ?? ipfsToGateway(nft.imageIpfsUri);
                    const href = nft.chainId && nft.contractAddress && nft.tokenId ? `/marketplace/assets/${nft.chainId}/${nft.contractAddress}/${nft.tokenId}` : `/nft/${nft._id}`;
                    return (
                      <Link key={nft._id} href={href} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:border-cyan/30">
                        <div className="aspect-square bg-black/40">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}</div>
                        <div className="p-3">
                          <p className="truncate text-sm font-bold">{nft.name ?? "NFT"}</p>
                          <p className="text-xs text-muted">{nft.likeCount ?? 0} likes</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : <MarketplaceEmptyState title="Trending data will appear as users interact with collections." />}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-12">
            <ListingSection title="Latest Single NFTs" listings={singleNftListings} isLoading={isLoading} empty="No listed single NFTs yet." />
            <ListingSection title="Latest Collection NFTs" listings={collectionListings} isLoading={isLoading} empty="No listed collection NFTs yet." />
          </div>

          <aside className="rounded-2xl border border-white/10 bg-panel p-5 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2">
              <Activity className="text-cyan" size={18} />
              <h2 className="text-xl font-black">Recent Activity</h2>
            </div>
            <div className="mt-4 space-y-3">
              {activity.length ? activity.map((item) => (
                <ActivityFeedItem
                  key={item._id}
                  label={activityLabel(item)}
                  walletLabel={shortAddress(item.wallet)}
                  timestamp={item.timestamp}
                  image={item.asset?.imageUrl ?? ipfsToGateway(item.asset?.imageIpfsUri) ?? item.nftItemId?.imageUrl ?? ipfsToGateway(item.nftItemId?.imageIpfsUri)}
                />
              )) : <p className="text-sm text-muted">No marketplace activity yet.</p>}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function ListingSection({ title, listings, isLoading, empty }: { title: string; listings: Listing[]; isLoading: boolean; empty: string }) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black">{title}</h2>
        <div className="flex gap-2 text-xs text-muted">
          <span className="rounded-full border border-white/10 px-3 py-2">Price filter soon</span>
          <span className="rounded-full border border-white/10 px-3 py-2">Sort: newest</span>
        </div>
      </div>
      {isLoading ? <SkeletonGrid /> : listings.length ? <ListingGrid listings={listings} /> : <MarketplaceEmptyState title={empty} />}
    </section>
  );
}

function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => {
        const image = listing.asset?.imageUrl ?? ipfsToGateway(listing.asset?.imageIpfsUri) ?? listing.nftItemId?.imageUrl ?? ipfsToGateway(listing.nftItemId?.imageIpfsUri);
        const collectionName = listing.asset?.collectionName ?? (typeof listing.collectionId === "object" ? listing.collectionId.name : undefined);
        return (
          <NftListingCard
            key={listing._id}
            href={`/marketplace/assets/${listing.chainId}/${listing.nftContract}/${listing.tokenId}`}
            image={image}
            name={listing.asset?.name ?? listing.nftItemId?.name ?? `Token #${listing.tokenId}`}
            collectionName={collectionName}
            price={listing.price}
            seller={listing.seller}
            status="Listed"
            isVerifiedCreator={listing.asset?.isVerifiedCreator}
            isVerifiedCollection={listing.asset?.isVerifiedCollection}
            isProCreator={listing.asset?.isProCreator}
          />
        );
      })}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-white/5" />)}
    </div>
  );
}
