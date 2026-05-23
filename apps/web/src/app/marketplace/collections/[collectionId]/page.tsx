"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Grid3X3, Info, ListFilter, Search, SlidersHorizontal, Tag } from "lucide-react";
import { CreatorBadges } from "@/components/badges/CreatorBadges";
import { LikeButton } from "@/components/marketplace/LikeButton";
import { ActivityFeedItem, FilterPanel, FilterSection, MarketplaceBadge, MarketplaceEmptyState, MarketplaceStat, NftListingCard } from "@/components/marketplace/MarketplacePrimitives";
import { SiteHeader } from "@/components/site-header";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { api } from "@/lib/api";
import { formatMarketplaceDate, formatWeiEth, shortAddress } from "@/lib/format/marketplace";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/web3/explorer";

type CollectionStats = {
  floorPrice: string | null;
  totalVolume: string;
  totalSales: number;
  activeListings: number;
  ownersCount: number | null;
  itemsCount: number;
  lastSalePrice: string | null;
  lastSaleAt: string | null;
  hasActivity: boolean;
};

type Listing = {
  _id: string;
  chainId: number;
  nftContract: string;
  tokenId: string;
  seller: string;
  price: string;
  nftItemId?: { name?: string; imageUrl?: string; imageIpfsUri?: string };
  collectionId?: CollectionSummary | string;
  asset?: { name?: string; imageUrl?: string; imageIpfsUri?: string; isVerifiedCreator?: boolean; isVerifiedCollection?: boolean; isProCreator?: boolean };
};

type ActivityRow = {
  _id: string;
  type: string;
  wallet: string;
  counterparty?: string;
  price?: string;
  tokenId?: string;
  txHash?: string;
  timestamp: string;
  nftItemId?: { name?: string; tokenNumber?: number; imageUrl?: string; imageIpfsUri?: string };
  asset?: { name?: string; imageUrl?: string; imageIpfsUri?: string };
};

type CollectionSummary = {
  _id: string;
  name?: string;
  description?: string;
  coverImageUrl?: string;
  slug?: string;
  chainId?: number;
  contractAddress?: string;
  creatorWallet?: string;
  royaltyBps?: number;
  platformMintFeeBps?: number;
  bannerImageUrl?: string;
  profileImageUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  externalUrl?: string;
  creatorDisplayName?: string;
  creatorBio?: string;
  creatorAvatarUrl?: string;
  likeCount?: number;
  viewCount?: number;
  trendingScore?: number;
  isVerifiedCollection?: boolean;
  isVerifiedCreator?: boolean;
  isProCreator?: boolean;
  collectionBadge?: string;
  creatorProfile?: {
    displayName?: string;
    walletAddress?: string;
    isVerifiedCreator?: boolean;
    isProCreator?: boolean;
  };
};

type TabId = "items" | "activity" | "analytics" | "about";

function ipfsToGateway(ipfsUri?: string) {
  return ipfsUri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${ipfsUri.replace("ipfs://", "")}` : undefined;
}

export default function MarketplaceCollectionPage() {
  const params = useParams<{ collectionId: string }>();
  const [stats, setStats] = useState<CollectionStats>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [collection, setCollection] = useState<CollectionSummary>();
  const [activeTab, setActiveTab] = useState<TabId>("items");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.collectionId) return;
    const viewKey = `nexmint:collection-view:${params.collectionId}`;
    const lastView = Number(localStorage.getItem(viewKey) ?? 0);
    if (Date.now() - lastView > 60 * 60 * 1000) {
      localStorage.setItem(viewKey, String(Date.now()));
      void api(`/api/collections/${params.collectionId}/view`, { method: "POST" }).catch(() => undefined);
    }
    Promise.all([
      api<CollectionStats>(`/api/marketplace/collections/${params.collectionId}/stats`),
      api<{ collection: CollectionSummary }>(`/api/collections/${params.collectionId}`),
      api<{ listings: Listing[] }>(`/api/marketplace/listings?collectionId=${params.collectionId}&limit=48`),
      api<{ activity: ActivityRow[] }>(`/api/marketplace/activity/recent?collectionId=${params.collectionId}&limit=30`)
    ])
      .then(([nextStats, nextCollection, nextListings, nextActivity]) => {
        setStats(nextStats);
        setCollection(nextCollection.collection);
        setListings(nextListings.listings);
        setActivity(nextActivity.activity);
        const linked = nextListings.listings[0];
        if (!nextCollection.collection && linked && typeof linked.collectionId === "object") setCollection(linked.collectionId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load collection marketplace"))
      .finally(() => setIsLoading(false));
  }, [params.collectionId]);

  const activeListings = stats?.activeListings ?? 0;
  const hasHistoricalMarket = Boolean((stats?.totalSales ?? 0) > 0 || stats?.hasActivity || activity.length > 0);
  const contractUrl = collection?.chainId && collection.contractAddress ? getExplorerAddressUrl(collection.chainId, collection.contractAddress) : undefined;
  const filteredListings = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const rows = lowered
      ? listings.filter((listing) => `${listing.nftItemId?.name ?? ""} ${listing.tokenId}`.toLowerCase().includes(lowered))
      : listings;
    return [...rows].sort((a, b) => {
      if (sort === "price_asc") return BigInt(a.price) > BigInt(b.price) ? 1 : -1;
      if (sort === "price_desc") return BigInt(a.price) < BigInt(b.price) ? 1 : -1;
      if (sort === "token") return Number(a.tokenId) - Number(b.tokenId);
      return 0;
    });
  }, [listings, query, sort]);

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <SiteHeader />
      <section className="border-b border-white/10">
        <div className="relative h-72 overflow-hidden">
          {collection?.bannerImageUrl || collection?.coverImageUrl ? <img src={collection.bannerImageUrl ?? collection.coverImageUrl} alt="" className="h-full w-full scale-105 object-cover opacity-50 blur-sm" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.15),#050608_92%)]" />
        </div>
        <div className="relative mx-auto -mt-24 max-w-7xl px-4 pb-6">
          <Link href="/marketplace" className="text-sm text-cyan hover:underline">Back to Marketplace</Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="flex min-w-0 items-end gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-panel shadow-2xl">
                {collection?.profileImageUrl || collection?.coverImageUrl ? <img src={collection.profileImageUrl ?? collection.coverImageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-4xl font-black md:text-5xl">{collection?.name ?? "Marketplace Collection"}</h1>
                  <CreatorBadges
                    size="md"
                    isVerifiedCollection={collection?.isVerifiedCollection}
                    isVerifiedCreator={collection?.isVerifiedCreator ?? collection?.creatorProfile?.isVerifiedCreator}
                    isProCreator={collection?.isProCreator ?? collection?.creatorProfile?.isProCreator}
                  />
                  <MarketplaceBadge tone="cyan">AI Collection</MarketplaceBadge>
                  <MarketplaceBadge tone={activeListings > 0 ? "lime" : "neutral"}>{activeListings > 0 ? "Active market" : "No active listings"}</MarketplaceBadge>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{collection?.description ?? "Collection marketplace stats and listings."}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                {collection?.chainId ? <ChainBadge chainId={collection.chainId} compact /> : null}
                  {contractUrl ? <a href={contractUrl} target="_blank" rel="noreferrer" className="text-cyan hover:underline">Contract {shortAddress(collection?.contractAddress)}</a> : null}
                  {collection?.creatorWallet || collection?.creatorProfile ? (
                    <span className="inline-flex items-center gap-1.5">
                      Creator {collection.creatorDisplayName || collection.creatorProfile?.displayName || shortAddress(collection.creatorProfile?.walletAddress ?? collection.creatorWallet)}
                      <CreatorBadges isVerifiedCreator={collection?.isVerifiedCreator ?? collection?.creatorProfile?.isVerifiedCreator} isProCreator={collection?.isProCreator ?? collection?.creatorProfile?.isProCreator} />
                    </span>
                  ) : null}
                  <span>{stats?.itemsCount ?? 0} items</span>
                  <span>{collection?.viewCount ?? 0} views</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <LikeButton target="collection" id={collection?._id} initialCount={collection?.likeCount ?? 0} />
                  <SocialLinks collection={collection} />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-5 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <MarketplaceStat label="Floor Price" value={activeListings > 0 ? formatWeiEth(stats?.floorPrice) : "-"} helper="Based on active listings only." />
            <MarketplaceStat label="Top Offer" value="Coming soon" />
            <MarketplaceStat label="Total Volume" value={formatWeiEth(stats?.totalVolume)} />
            <MarketplaceStat label="Total Sales" value={stats?.totalSales ?? 0} />
            <MarketplaceStat label="Active Listings" value={activeListings} />
            <MarketplaceStat label="Owners" value={stats?.ownersCount ?? "-"} />
            <MarketplaceStat label="Items" value={stats?.itemsCount ?? 0} />
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
            Marketplace stats are based on verified NEXMINT marketplace events. External marketplace sales may not be included yet.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6 overflow-x-auto border-b border-white/10">
          {[
            ["items", Grid3X3, "Items"],
            ["activity", Activity, "Activity"],
            ["analytics", BarChart3, "Analytics"],
            ["about", Info, "About"]
          ].map(([id, Icon, label]) => {
            const LucideIcon = Icon as typeof Grid3X3;
            return (
              <button key={String(id)} onClick={() => setActiveTab(id as TabId)} className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-bold ${activeTab === id ? "border-cyan text-white" : "border-transparent text-muted hover:text-white"}`}>
                <LucideIcon size={16} /> {String(label)}
              </button>
            );
          })}
        </div>

        {activeTab === "items" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <FilterPanel>
              <FilterSection title="Status">
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Listed</label>
                <label className="flex items-center gap-2 opacity-60"><input type="checkbox" disabled /> Not Listed</label>
                <label className="flex items-center gap-2 opacity-60"><input type="checkbox" disabled /> Owned by me</label>
              </FilterSection>
              <FilterSection title="Price">
                <p>Native ETH only in Marketplace V1.</p>
              </FilterSection>
              <FilterSection title="Traits">
                <p>Trait filters coming soon.</p>
              </FilterSection>
              <FilterSection title="Rarity">
                <p>Rarity filters coming soon.</p>
              </FilterSection>
            </FilterPanel>
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel p-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <Search size={16} className="text-muted" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by item or token ID" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
                </div>
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  <option value="recent">Recently listed</option>
                  <option value="price_asc">Price low to high</option>
                  <option value="price_desc">Price high to low</option>
                  <option value="token">Token ID</option>
                </select>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-muted">
                  <SlidersHorizontal size={16} />
                  <ListFilter size={16} />
                </div>
              </div>

              {isLoading ? <div className="mt-5 h-72 animate-pulse rounded-xl bg-white/5" /> : filteredListings.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredListings.map((listing) => {
                    const image = listing.asset?.imageUrl ?? ipfsToGateway(listing.asset?.imageIpfsUri) ?? listing.nftItemId?.imageUrl ?? ipfsToGateway(listing.nftItemId?.imageIpfsUri);
                    return (
                      <NftListingCard
                        key={listing._id}
                        href={`/marketplace/assets/${listing.chainId}/${listing.nftContract}/${listing.tokenId}`}
                        image={image}
                        name={listing.asset?.name ?? listing.nftItemId?.name ?? `Token #${listing.tokenId}`}
                        collectionName={collection?.name}
                        price={listing.price}
                        seller={listing.seller}
                        status="Listed"
                        isVerifiedCreator={listing.asset?.isVerifiedCreator ?? collection?.isVerifiedCreator}
                        isVerifiedCollection={listing.asset?.isVerifiedCollection ?? collection?.isVerifiedCollection}
                        isProCreator={listing.asset?.isProCreator ?? collection?.isProCreator}
                      />
                    );
                  })}
                </div>
              ) : (
                <MarketplaceEmptyState
                  title="No active listings right now."
                  description={hasHistoricalMarket ? "This collection has previous marketplace activity, but no NFTs are currently listed for sale." : "Listings will appear here after owners list NFTs from this collection."}
                  action={<Link href="/dashboard" className="inline-flex rounded-md border border-cyan/30 px-4 py-2 text-sm font-bold text-cyan hover:bg-cyan/10">View My NFTs</Link>}
                />
              )}
            </section>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-5">
            <h2 className="text-2xl font-black">Activity</h2>
            <div className="mt-5 space-y-3">
              {activity.length ? activity.map((item) => (
                <ActivityFeedItem
                  key={item._id}
                  label={collectionActivityLabel(item)}
                  walletLabel={activityPartyLabel(item)}
                  timestamp={item.timestamp}
                  txUrl={item.txHash && collection?.chainId ? getExplorerTxUrl(collection.chainId, item.txHash) : undefined}
                  image={item.asset?.imageUrl ?? ipfsToGateway(item.asset?.imageIpfsUri) ?? item.nftItemId?.imageUrl ?? ipfsToGateway(item.nftItemId?.imageIpfsUri)}
                />
              )) : <MarketplaceEmptyState title="No marketplace activity yet." />}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MarketplaceStat label="Floor Price" value={activeListings > 0 ? formatWeiEth(stats?.floorPrice) : "-"} helper="Based on active listings only." />
            <MarketplaceStat label="Last Sale" value={stats?.lastSalePrice ? formatWeiEth(stats.lastSalePrice) : "-"} helper={stats?.lastSaleAt ? formatMarketplaceDate(stats.lastSaleAt) : "No sale yet"} />
            <MarketplaceStat label="Total Volume" value={formatWeiEth(stats?.totalVolume)} />
            <MarketplaceStat label="More Analytics" value="Coming soon" helper="Trait floors and historical charts are planned." />
          </div>
        )}

        {activeTab === "about" && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-panel p-5">
              <h2 className="text-2xl font-black">About</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{collection?.description ?? "No collection description available."}</p>
              {collection?.creatorBio ? <p className="mt-4 text-sm leading-7 text-muted">Creator: {collection.creatorBio}</p> : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-panel p-5">
              <h2 className="text-2xl font-black">Blockchain Details</h2>
              <Detail label="Contract" value={collection?.contractAddress ? shortAddress(collection.contractAddress) : "-"} href={contractUrl} />
              <Detail label="Chain" value={collection?.chainId ? String(collection.chainId) : "-"} />
              <Detail label="Creator" value={shortAddress(collection?.creatorWallet)} />
              <Detail label="Royalty" value={collection?.royaltyBps != null ? `${collection.royaltyBps / 100}%` : "Unavailable"} />
              <Detail label="Marketplace fee" value={collection?.platformMintFeeBps != null ? `${collection.platformMintFeeBps / 100}%` : "Configured by marketplace"} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function collectionActivityLabel(activity: ActivityRow) {
  const itemName = activity.nftItemId?.name ?? (activity.tokenId ? `#${activity.tokenId}` : "NFT");
  if (activity.type === "listed") return `${itemName} listed for ${formatWeiEth(activity.price)}`;
  if (activity.type === "sold") return `${itemName} sold for ${formatWeiEth(activity.price)}`;
  if (activity.type === "cancelled") return `${itemName} listing cancelled`;
  return itemName;
}

function activityPartyLabel(activity: ActivityRow) {
  if (activity.type === "sold") return `Buyer ${shortAddress(activity.wallet)} - Seller ${shortAddress(activity.counterparty)}`;
  if (activity.type === "listed") return `Seller ${shortAddress(activity.wallet)}`;
  if (activity.type === "cancelled") return `Seller ${shortAddress(activity.wallet)}`;
  return shortAddress(activity.wallet);
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm font-bold text-cyan hover:underline">{value}</a> : <p className="mt-1 text-sm font-bold">{value}</p>}
    </div>
  );
}

function SocialLinks({ collection }: { collection?: CollectionSummary }) {
  const links = [
    ["Website", collection?.websiteUrl],
    ["X", collection?.twitterUrl],
    ["Discord", collection?.discordUrl],
    ["Telegram", collection?.telegramUrl],
    ["External", collection?.externalUrl]
  ].filter(([, href]) => Boolean(href));
  if (!links.length) return <span className="text-xs text-muted">Owner has not added profile links yet.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-muted hover:border-cyan/30 hover:text-cyan">
          {label}
        </a>
      ))}
    </div>
  );
}
