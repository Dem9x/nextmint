"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BadgeDollarSign, FileText, Info, ListChecks, ShieldCheck, Tag } from "lucide-react";
import { CreatorBadges } from "@/components/badges/CreatorBadges";
import { useAccount, useWriteContract } from "wagmi";
import { LikeButton } from "@/components/marketplace/LikeButton";
import { ActivityFeedItem, MarketplaceBadge, MarketplaceEmptyState, MarketplaceStat } from "@/components/marketplace/MarketplacePrimitives";
import { ExternalMarketplaceLinks } from "@/components/nft/ExternalMarketplaceLinks";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { api } from "@/lib/api";
import { activityLabel, formatMarketplaceDate, formatWeiEth, shortAddress } from "@/lib/format/marketplace";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/web3/explorer";
import { buildBuyItemArgs, buildCancelListingArgs, getMarketplaceAddress, marketplaceAbi } from "@/lib/web3/marketplace";

type CollectionSummary = {
  _id: string;
  name?: string;
  slug?: string;
  description?: string;
  coverImageUrl?: string;
};

type Listing = {
  _id?: string;
  chainId: number;
  nftContract: string;
  tokenId: string;
  seller: string;
  price: string;
  currency: string;
  status: string;
  collectionId?: CollectionSummary | string;
  nftItemId?: {
    _id?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    imageIpfsUri?: string;
    metadataIpfsUri?: string;
    likeCount?: number;
    viewCount?: number;
  };
};

type ResolvedAsset = {
  chainId: number;
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageIpfsUri?: string;
  metadataIpfsUri?: string;
  metadataGatewayUrl?: string;
  attributes?: Array<{ trait_type?: string; value?: string | number; traitType?: string; trait_type_name?: string; display_type?: string }>;
  collectionId?: string;
  collectionName?: string;
  collectionSlug?: string;
  generationId?: string;
  nftItemId?: string;
  ownerWallet?: string;
  metadata?: { image?: string; attributes?: Array<{ trait_type?: string; value?: string | number; traitType?: string; trait_type_name?: string; display_type?: string }> };
  creatorProfile?: { displayName?: string; walletAddress?: string; isVerifiedCreator?: boolean; isProCreator?: boolean };
  isVerifiedCollection?: boolean;
  isVerifiedCreator?: boolean;
  isProCreator?: boolean;
  source: "nft_item" | "generation" | "token_uri" | "unknown";
};

type ContractStats = {
  floorPrice: string | null;
  totalVolume: string;
  totalSales: number;
  activeListings: number;
  ownersCount: number | null;
  itemsCount: number;
  lastSalePrice?: string | null;
  lastSaleAt?: string | null;
};

type ActivityRow = {
  _id: string;
  type: string;
  wallet: string;
  counterparty?: string;
  price?: string;
  txHash: string;
  timestamp: string;
};

type TabId = "details" | "orders" | "activity";

function ipfsToGateway(ipfsUri?: string) {
  return ipfsUri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${ipfsUri.replace("ipfs://", "")}` : undefined;
}

function imageFromMetadata(asset?: ResolvedAsset) {
  const image = asset?.metadata?.image;
  if (!image) return undefined;
  return image.startsWith("ipfs://") ? ipfsToGateway(image) : image;
}

function assetTraits(asset?: ResolvedAsset) {
  return (asset?.attributes?.length ? asset.attributes : asset?.metadata?.attributes ?? [])
    .map((trait) => ({
      type: trait.trait_type ?? trait.traitType ?? trait.trait_type_name ?? "Trait",
      value: trait.value ?? "-"
    }))
    .filter((trait) => trait.value !== "-");
}

export default function MarketplaceAssetPage() {
  const params = useParams<{ chainId: string; contractAddress: string; tokenId: string }>();
  const chainId = Number(params.chainId);
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [asset, setAsset] = useState<ResolvedAsset>();
  const [listing, setListing] = useState<Listing>();
  const [stats, setStats] = useState<ContractStats>();
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const marketplaceAddress = getMarketplaceAddress(chainId);

  async function load() {
    setError(undefined);
    const assetResult = await api<{ listing?: Listing | null; asset: ResolvedAsset; stats: ContractStats; activity: ActivityRow[] }>(`/api/marketplace/listings/${chainId}/${params.contractAddress}/${params.tokenId}`);
    setListing(assetResult.listing ?? undefined);
    setAsset(assetResult.asset);
    setStats(assetResult.stats);
    setActivity(assetResult.activity);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load asset"));
  }, [chainId, params.contractAddress, params.tokenId]);

  useEffect(() => {
    const itemId = asset?.nftItemId ?? listing?.nftItemId?._id;
    if (!itemId) return;
    const viewKey = `nexmint:nft-view:${itemId}`;
    const lastView = Number(localStorage.getItem(viewKey) ?? 0);
    if (Date.now() - lastView > 60 * 60 * 1000) {
      localStorage.setItem(viewKey, String(Date.now()));
      void api(`/api/nft-items/${itemId}/view`, { method: "POST" }).catch(() => undefined);
    }
  }, [asset?.nftItemId, listing?.nftItemId]);

  const isSeller = Boolean(address && listing?.seller && listing.seller.toLowerCase() === address.toLowerCase());
  const image = asset?.imageUrl ?? ipfsToGateway(asset?.imageIpfsUri) ?? imageFromMetadata(asset) ?? listing?.nftItemId?.imageUrl ?? ipfsToGateway(listing?.nftItemId?.imageIpfsUri);
  const name = asset?.name ?? listing?.nftItemId?.name ?? `Token #${params.tokenId}`;
  const collection = typeof listing?.collectionId === "object" ? listing.collectionId : undefined;
  const collectionName = collection?.name ?? asset?.collectionName;
  const collectionId = collection?._id ?? asset?.collectionId;
  const contractUrl = getExplorerAddressUrl(chainId, params.contractAddress);
  const itemId = asset?.nftItemId ?? listing?.nftItemId?._id;
  const traits = assetTraits(asset);

  async function buy() {
    try {
      if (!listing || !marketplaceAddress) throw new Error("Marketplace listing is not available");
      setStatus("Buying NFT...");
      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "buyItem",
        args: buildBuyItemArgs(listing.nftContract, listing.tokenId),
        value: BigInt(listing.price)
      });
      setStatus("Verifying sale...");
      await api("/api/marketplace/verify-sale", { method: "POST", body: JSON.stringify({ chainId, txHash }) });
      setStatus("Sale verified.");
      await load();
    } catch (err) {
      setStatus(undefined);
      setError(err instanceof Error ? err.message : "Buy failed");
    }
  }

  async function cancel() {
    try {
      if (!listing || !marketplaceAddress) throw new Error("Marketplace listing is not available");
      setStatus("Cancelling listing...");
      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "cancelListing",
        args: buildCancelListingArgs(listing.nftContract, listing.tokenId)
      });
      setStatus("Verifying cancellation...");
      await api("/api/marketplace/verify-cancel", { method: "POST", body: JSON.stringify({ chainId, txHash }) });
      setStatus("Listing cancelled.");
      await load();
    } catch (err) {
      setStatus(undefined);
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/marketplace" className="text-sm text-cyan hover:underline">Back to Marketplace</Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel shadow-[0_30px_80px_rgba(0,0,0,.35)]">
              <div className="aspect-square bg-black/40">
                {image ? (
                  <img src={image} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center text-muted">
                    <span>Image unavailable</span>
                    <span className="mt-2 text-xs">{asset?.imageIpfsUri || asset?.metadataIpfsUri ? "Metadata image could not be resolved yet." : "No image metadata found for this asset yet."}</span>
                  </div>
                )}
              </div>
            </div>
            <ExternalMarketplaceLinks chainId={chainId} contractAddress={params.contractAddress} tokenId={params.tokenId} />
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-center gap-2">
                {collectionName && collectionId ? <Link href={`/marketplace/collections/${collectionId}`} className="font-bold text-cyan hover:underline">{collectionName}</Link> : <span className="font-bold text-cyan">Single NFT</span>}
                <CreatorBadges isVerifiedCollection={asset?.isVerifiedCollection} isVerifiedCreator={asset?.isVerifiedCreator ?? asset?.creatorProfile?.isVerifiedCreator} isProCreator={asset?.isProCreator ?? asset?.creatorProfile?.isProCreator} />
                <MarketplaceBadge tone="cyan"><ShieldCheck size={12} /> Testnet</MarketplaceBadge>
                <ChainBadge chainId={chainId} compact />
              </div>
              <h1 className="mt-4 text-4xl font-black">{name}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{asset?.description ?? listing?.nftItemId?.description ?? collection?.description ?? "NEXMINT marketplace asset."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <LikeButton target="nft" id={itemId} initialCount={listing?.nftItemId?.likeCount ?? 0} />
                <span className="text-xs text-muted">{listing?.nftItemId?.viewCount ?? 0} views</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoBox
                  label="Creator"
                  value={asset?.creatorProfile?.displayName ?? shortAddress(asset?.creatorProfile?.walletAddress)}
                />
                <InfoBox label="Owner / Seller" value={listing ? shortAddress(listing.seller) : "No active listing"} />
                <InfoBox label="Contract" value={shortAddress(params.contractAddress)} href={contractUrl} />
              </div>
            </div>

            <div className="rounded-3xl border border-cyan/20 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(255,255,255,.03))] p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <MarketplaceStat label="Top Offer" value="Coming soon" />
                <MarketplaceStat label="Collection Floor" value={formatWeiEth(stats?.floorPrice)} />
                <MarketplaceStat label="Last Sale" value={stats?.lastSalePrice ? formatWeiEth(stats.lastSalePrice) : "-"} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
                {listing ? (
                  <>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Buy for</p>
                    <p className="mt-2 text-4xl font-black text-cyan">{formatWeiEth(listing.price)}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button disabled={isSeller || isPending} onClick={buy}>{isPending ? "Waiting..." : "Buy Now"}</Button>
                      <Button disabled className="border border-white/10 bg-transparent text-muted">Make Offer · Coming soon</Button>
                      {isSeller && <Button disabled={isPending} onClick={cancel} className="border border-rose/30 bg-transparent text-rose">Cancel Listing</Button>}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-black">Not currently listed</p>
                    <p className="mt-2 text-sm text-muted">{address ? "If this NFT is yours, list it from your dashboard." : "Connect the owner wallet to list this NFT."}</p>
                    <Link href="/dashboard" className="mt-5 inline-flex rounded-md border border-cyan/30 px-4 py-2 text-sm font-bold text-cyan hover:bg-cyan/10">Go to Dashboard</Link>
                  </>
                )}
              </div>
              {status && <p className="mt-4 rounded-md border border-lime/30 bg-lime/10 p-3 text-sm text-lime">{status}</p>}
              {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
            </div>

            <div className="flex gap-5 overflow-x-auto border-b border-white/10">
              {[
                ["details", FileText, "Details"],
                ["orders", ListChecks, "Orders"],
                ["activity", Activity, "Activity"]
              ].map(([id, Icon, label]) => {
                const LucideIcon = Icon as typeof FileText;
                return (
                  <button key={String(id)} onClick={() => setActiveTab(id as TabId)} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold ${activeTab === id ? "border-cyan text-white" : "border-transparent text-muted hover:text-white"}`}>
                    <LucideIcon size={16} /> {String(label)}
                  </button>
                );
              })}
            </div>

            {activeTab === "details" && (
              <div className="space-y-3">
                <ExpandableSection title="Traits" icon={Tag}>
                  {traits.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {traits.map((trait, index) => (
                        <div key={`${trait.type}-${index}`} className="rounded-xl border border-cyan/15 bg-cyan/5 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-cyan/80">{trait.type}</p>
                          <p className="mt-1 break-words text-sm font-black">{String(trait.value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Traits unavailable.</p>
                  )}
                </ExpandableSection>
                <ExpandableSection title="About" icon={Info}>
                  <p className="text-sm leading-6 text-muted">{asset?.description ?? listing?.nftItemId?.description ?? collection?.description ?? "No metadata description available."}</p>
                </ExpandableSection>
                <ExpandableSection title="Blockchain Details" icon={BadgeDollarSign}>
                  <InfoBox label="Token ID" value={params.tokenId} />
                  <InfoBox label="Token Standard" value="ERC721" />
                  <InfoBox label="Chain" value={String(chainId)} />
                  <InfoBox label="Metadata URI" value={asset?.metadataIpfsUri ?? listing?.nftItemId?.metadataIpfsUri ?? "Unavailable"} />
                  <InfoBox label="Asset Source" value={asset?.source ?? "unknown"} />
                </ExpandableSection>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="rounded-2xl border border-white/10 bg-panel p-5">
                <h2 className="text-xl font-black">Orders</h2>
                {listing ? <p className="mt-3 text-sm text-muted">Current listing: {formatWeiEth(listing.price)} by {shortAddress(listing.seller)}</p> : <p className="mt-3 text-sm text-muted">No active listing.</p>}
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">Collection offers and Make Offer are coming soon.</p>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="rounded-2xl border border-white/10 bg-panel p-5">
                <h2 className="text-xl font-black">Activity</h2>
                <div className="mt-4 space-y-3">
                  {activity.length ? activity.map((item) => (
                    <ActivityFeedItem
                      key={item._id}
                      label={activityLabel(item)}
                      walletLabel={activityPartyLabel(item)}
                      timestamp={item.timestamp}
                      txUrl={getExplorerTxUrl(chainId, item.txHash)}
                    />
                  )) : <MarketplaceEmptyState title="No activity yet." />}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function activityPartyLabel(activity: ActivityRow) {
  if (activity.type === "sold") return `Buyer ${shortAddress(activity.wallet)} - Seller ${shortAddress(activity.counterparty)}`;
  if (activity.type === "listed") return `Seller ${shortAddress(activity.wallet)}`;
  if (activity.type === "cancelled") return `Seller ${shortAddress(activity.wallet)}`;
  return shortAddress(activity.wallet);
}

function InfoBox({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-flex break-all text-sm font-bold text-cyan hover:underline">{value}</a> : <p className="mt-1 break-all text-sm font-bold">{value}</p>}
    </div>
  );
}

function ExpandableSection({ title, icon: Icon, children }: { title: string; icon: typeof Tag; children: React.ReactNode }) {
  return (
    <details className="rounded-2xl border border-white/10 bg-panel p-4" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-black">
        <Icon size={16} className="text-cyan" /> {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
