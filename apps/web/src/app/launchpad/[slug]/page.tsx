"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, BarChart3, Bot, CheckCircle2, Clock, Copy, Grid3X3, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { formatEther, parseAbi } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/web3/explorer";

const launchMintAbi = parseAbi([
  "function publicMint(uint256 quantity) payable",
  "function publicMintPrice() view returns (uint256)",
  "function paused() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)"
]);

type CollectionItem = {
  _id: string;
  tokenNumber?: number;
  name: string;
  imageUrl?: string;
  imageIpfsUri?: string;
  rarityTier?: string;
  rarityRank?: number;
  rarityScore?: number;
  generationStatus?: string;
  mintStatus?: string;
  minted?: boolean;
  tokenId?: string;
  ownerWallet?: string;
};

type MintActivity = {
  _id: string;
  minterWallet: string;
  tokenIds: string[];
  quantity: number;
  grossAmountToken?: string;
  token?: string;
  txHash: string;
  createdAt: string;
};

type TraitSummary = {
  traitType: string;
  value: string | number;
  count: number;
};

type Collection = {
  _id: string;
  name: string;
  slug: string;
  symbol?: string;
  description?: string;
  chainId: number;
  contractAddress: `0x${string}`;
  creatorWallet?: string;
  coverImageUrl?: string;
  coverImageIpfsUri?: string;
  metadataBaseUri?: string;
  metadataBaseIpfsUri?: string;
  basePrompt?: string;
  style?: string;
  maxSupply: number;
  totalMinted: number;
  mintPrice: string;
  mintCurrency: string;
  maxMintPerWallet: number;
  status: string;
  liveStatus: string;
  publicMintStartAt?: string;
  publicMintEndAt?: string;
  platformMintFeeBps?: number;
};

type LaunchpadResponse = {
  collection: Collection;
  items: CollectionItem[];
  recentMints: MintActivity[];
  traitSummary: TraitSummary[];
};

const tabs = [
  { id: "mint", label: "Mint", icon: Sparkles },
  { id: "items", label: "Items", icon: Grid3X3 },
  { id: "traits", label: "Traits", icon: Tag },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "ai", label: "AI Provenance", icon: Bot }
] as const;

type TabId = (typeof tabs)[number]["id"];

function getReadableMintError(error: unknown) {
  if (typeof error === "object" && error && "shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Mint failed";
}

function short(value?: string) {
  return value && value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value ?? "Unavailable";
}

function dateLabel(value?: string) {
  if (!value) return "Open";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function copy(value?: string) {
  if (!value || typeof navigator === "undefined") return;
  await navigator.clipboard.writeText(value);
}

export default function PublicMintPage() {
  const params = useParams<{ slug: string }>();
  const { address, chainId } = useAccount();
  const { selectedChainId, setSelectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const { writeContractAsync, isPending } = useWriteContract();
  const [collection, setCollection] = useState<Collection>();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [recentMints, setRecentMints] = useState<MintActivity[]>([]);
  const [traitSummary, setTraitSummary] = useState<TraitSummary[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("mint");
  const publicClient = usePublicClient({ chainId: collection?.chainId });
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [tokenIds, setTokenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: price, error: priceReadError } = useReadContract({
    address: collection?.contractAddress,
    abi: launchMintAbi,
    functionName: "publicMintPrice",
    chainId: collection?.chainId,
    query: { enabled: Boolean(collection?.contractAddress) }
  });
  const { data: totalSupply } = useReadContract({
    address: collection?.contractAddress,
    abi: launchMintAbi,
    functionName: "totalSupply",
    chainId: collection?.chainId,
    query: { enabled: Boolean(collection?.contractAddress) }
  });
  const { data: contractMaxSupply } = useReadContract({
    address: collection?.contractAddress,
    abi: launchMintAbi,
    functionName: "maxSupply",
    chainId: collection?.chainId,
    query: { enabled: Boolean(collection?.contractAddress) }
  });
  const { data: paused } = useReadContract({
    address: collection?.contractAddress,
    abi: launchMintAbi,
    functionName: "paused",
    chainId: collection?.chainId,
    query: { enabled: Boolean(collection?.contractAddress) }
  });

  useEffect(() => {
    if (!params.slug) return;
    withMinimumDelay(api<LaunchpadResponse>(`/api/launchpad/collections/${params.slug}`))
      .then((result) => {
        setCollection(result.collection);
        setItems(result.items ?? []);
        setRecentMints(result.recentMints ?? []);
        setTraitSummary(result.traitSummary ?? []);
        setSelectedChainId(result.collection.chainId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Collection not found"))
      .finally(() => setIsLoading(false));
  }, [params.slug, setSelectedChainId]);

  const maxSupply = typeof contractMaxSupply === "bigint" ? Number(contractMaxSupply) : collection?.maxSupply ?? 0;
  const minted = typeof totalSupply === "bigint" ? Number(totalSupply) : collection?.totalMinted ?? 0;
  const remaining = Math.max(maxSupply - minted, 0);
  const progress = maxSupply ? Math.min((minted / maxSupply) * 100, 100) : 0;
  const heroImage = collection?.coverImageUrl ?? items.find((item) => item.imageUrl)?.imageUrl;
  const previewItems = useMemo(() => items.filter((item) => item.imageUrl).slice(0, 5), [items]);
  const now = Date.now();
  const started = !collection?.publicMintStartAt || new Date(collection.publicMintStartAt).getTime() <= now;
  const ended = Boolean(collection?.publicMintEndAt && new Date(collection.publicMintEndAt).getTime() < now);
  const soldOut = collection ? minted >= maxSupply : false;
  const statusAllowsMint = collection ? ["published", "minting_live"].includes(collection.status) : false;
  const priceReady = typeof price === "bigint";
  const canMint = Boolean(collection && address && chainId === collection.chainId && !isWrongNetwork && started && !ended && !soldOut && !paused && statusAllowsMint && priceReady);
  const contractUrl = collection?.chainId ? getExplorerAddressUrl(collection.chainId, collection.contractAddress) : undefined;

  async function mint() {
    try {
      if (!collection) return;
      if (!address) throw new Error("Connect wallet first");
      if (!collection.contractAddress) throw new Error("Collection contract address missing");
      if (!["published", "minting_live"].includes(collection.status)) throw new Error("Collection is not open for public mint");
      if (quantity < 1 || quantity > collection.maxMintPerWallet) throw new Error(`Quantity must be 1-${collection.maxMintPerWallet}`);
      if (chainId !== collection.chainId || isWrongNetwork) {
        setStatus("Switching network...");
        await switchToSelectedChain();
        return setStatus("Network switched. Click mint again.");
      }
      if (!publicClient) throw new Error("RPC client is not ready for selected chain");
      if (paused) throw new Error("Collection contract is paused");
      if (typeof price !== "bigint") throw new Error("Mint price unavailable. Refresh the page or check the contract.");
      const mintValue = price * BigInt(quantity);
      setIsLoading(true);
      setError(undefined);
      setStatus("Simulating mint...");
      try {
        await publicClient.simulateContract({
          account: address,
          address: collection.contractAddress,
          abi: launchMintAbi,
          functionName: "publicMint",
          args: [BigInt(quantity)],
          value: mintValue
        });
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("[NEXMINT] Launchpad mint simulation failed", err);
        throw new Error(`Mint simulation failed: ${getReadableMintError(err)}`);
      }
      setStatus("Waiting for wallet mint...");
      const txHash = await writeContractAsync({
        address: collection.contractAddress,
        abi: launchMintAbi,
        functionName: "publicMint",
        args: [BigInt(quantity)],
        value: mintValue
      });
      setStatus("Verifying public mint...");
      const verified = await withMinimumDelay(api<{ tokenIds: string[]; totalMinted: number; explorerUrl: string }>(`/api/launchpad/collections/${collection._id}/verify-mint`, {
        method: "POST",
        body: JSON.stringify({ chainId: collection.chainId, txHash, minterWallet: address })
      }));
      setTokenIds(verified.tokenIds);
      setCollection((current) => current ? { ...current, totalMinted: verified.totalMinted } : current);
      setRecentMints((current) => [{
        _id: txHash,
        minterWallet: address,
        tokenIds: verified.tokenIds,
        quantity,
        grossAmountToken: typeof price === "bigint" ? formatEther(price * BigInt(quantity)) : undefined,
        token: collection.mintCurrency,
        txHash,
        createdAt: new Date().toISOString()
      }, ...current]);
      setStatus("Mint confirmed on-chain.");
    } catch (err) {
      setStatus(undefined);
      setError(getReadableMintError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <SiteHeader />
      {isLoading && <div className="mx-auto max-w-7xl px-4 py-10 text-cyan">Loading mint campaign...</div>}
      {error && <div className="mx-auto mt-6 max-w-7xl rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</div>}
      {collection && (
        <>
          <section className="relative border-b border-white/10">
            <div className="absolute inset-0 overflow-hidden">
              {heroImage ? <img src={heroImage} alt="" className="h-full w-full scale-105 object-cover opacity-45 blur-sm" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.25),#050608_88%)]" />
            </div>
            <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-40">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="flex min-w-0 items-end gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-xl border border-white/20 bg-panel shadow-2xl">
                    {heroImage ? <img src={heroImage} alt={collection.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-4xl font-black tracking-tight md:text-5xl">{collection.name}</h1>
                      <ShieldCheck className="text-cyan" size={24} />
                      <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-black uppercase text-lime">AI Generated</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                      {collection.symbol && <span>{collection.symbol}</span>}
                      {collection.creatorWallet && <span>by {short(collection.creatorWallet)}</span>}
                      <ChainBadge chainId={collection.chainId} compact />
                      {contractUrl && <a className="text-cyan hover:underline" href={contractUrl} target="_blank" rel="noreferrer">Contract</a>}
                      <button className="inline-flex items-center gap-1 text-cyan" onClick={() => void copy(collection.contractAddress)}><Copy size={14} /> Copy</button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <CountdownBox label="Minted" value={`${minted}/${maxSupply}`} />
                  <CountdownBox label="Remaining" value={String(remaining)} />
                  <CountdownBox label="Status" value={soldOut ? "Sold out" : ended ? "Ended" : started ? "Live" : "Soon"} />
                </div>
              </div>
              <div className="mt-8 flex gap-5 overflow-x-auto border-t border-white/10 pt-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold ${activeTab === tab.id ? "border-cyan text-white" : "border-transparent text-muted hover:text-white"}`}>
                      <Icon size={16} /> {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-8">
            {activeTab === "mint" && (
              <div className="grid gap-8 lg:grid-cols-[560px_1fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-panel">
                    <div className="aspect-square bg-black/40">
                      {heroImage ? <img src={heroImage} alt={collection.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted">No preview image</div>}
                    </div>
                  </div>
                  {previewItems.length > 1 && (
                    <div className="grid grid-cols-5 gap-3">
                      {previewItems.map((item) => (
                        <button key={item._id} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5">
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <h2 className="text-3xl font-black">Mint {collection.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted">{collection.description || "AI-generated launchpad collection."}</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan" style={{ width: `${progress}%` }} /></div>
                  <div className="flex justify-between text-xs text-muted"><span>Available items</span><span>{remaining.toLocaleString()}</span></div>

                  <div className="rounded-xl border border-white/10 bg-panel p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted">Public stage</p>
                        <p className="mt-1 text-2xl font-black">{typeof price === "bigint" ? `${formatEther(price)} ${collection.mintCurrency}` : "Price unavailable"}</p>
                        <p className="mt-2 text-xs text-muted">Limit {collection.maxMintPerWallet} per wallet</p>
                      </div>
                      <ConnectButton />
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <input className="h-11 w-24 rounded-md border border-white/10 bg-black/40 px-3" type="number" min={1} max={collection.maxMintPerWallet} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                      <Button disabled={!canMint || isLoading || isPending} onClick={mint}>{isPending || isLoading ? "Minting..." : `Mint ${quantity}`}</Button>
                    </div>
                    {priceReadError && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">Mint price unavailable: {getReadableMintError(priceReadError)}</p>}
                    {status && <p className="mt-4 rounded-md border border-lime/30 bg-lime/10 p-3 text-lime">{status}</p>}
                    {tokenIds.length ? <p className="mt-4 rounded-md bg-white/5 p-3 text-sm">Minted token IDs: {tokenIds.join(", ")}</p> : null}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-panel p-5">
                    <p className="font-bold uppercase tracking-wide text-cyan">Mint Schedule</p>
                    <ScheduleRow title="Public mint" start={collection.publicMintStartAt} end={collection.publicMintEndAt} eligible={started && !ended && !soldOut} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "items" && <ItemsGrid items={items} />}
            {activeTab === "traits" && <TraitsPanel traits={traitSummary} total={items.length || maxSupply} />}
            {activeTab === "activity" && <ActivityPanel mints={recentMints} chainId={collection.chainId} />}
            {activeTab === "analytics" && <AnalyticsPanel minted={minted} maxSupply={maxSupply} mints={recentMints} collection={collection} />}
            {activeTab === "ai" && <AiPanel collection={collection} items={items} />}
          </section>
        </>
      )}
    </main>
  );
}

function CountdownBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-white/10 bg-black/35 px-4 py-3">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 uppercase text-muted">{label}</p>
    </div>
  );
}

function ScheduleRow({ title, start, end, eligible }: { title: string; start?: string; end?: string; eligible: boolean }) {
  return (
    <div className="mt-4 flex gap-4">
      <div className={`mt-1 h-3 w-3 rounded-full ${eligible ? "bg-lime" : "bg-white/20"}`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-xs text-muted">Starts: {dateLabel(start)}</p>
        <p className="text-xs text-muted">Ends: {end ? dateLabel(end) : "Open ended"}</p>
      </div>
      <span className={`text-xs font-black uppercase ${eligible ? "text-lime" : "text-muted"}`}>{eligible ? "Eligible" : "Not eligible"}</span>
    </div>
  );
}

function ItemsGrid({ items }: { items: CollectionItem[] }) {
  if (!items.length) return <EmptyPanel message="No generated items are available yet." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item._id} className="overflow-hidden rounded-xl border border-white/10 bg-panel">
          <div className="aspect-square bg-black/40">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">#{item.tokenNumber ?? "?"}</p>
              <span className="rounded-full border border-cyan/20 px-2 py-0.5 text-[10px] uppercase text-cyan">{item.rarityTier ?? "NFT"}</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted">{item.mintStatus ?? item.generationStatus ?? "ready"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TraitsPanel({ traits, total }: { traits: TraitSummary[]; total: number }) {
  if (!traits.length) return <EmptyPanel message="No trait distribution yet." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {traits.map((trait) => (
        <div key={`${trait.traitType}-${trait.value}`} className="rounded-xl border border-white/10 bg-panel p-4">
          <p className="text-xs uppercase text-muted">{trait.traitType}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-bold">{String(trait.value)}</p>
            <p className="text-sm text-cyan">{trait.count} items</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan" style={{ width: `${total ? Math.min((trait.count / total) * 100, 100) : 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function ActivityPanel({ mints, chainId }: { mints: MintActivity[]; chainId: number }) {
  if (!mints.length) return <EmptyPanel message="No live mints yet." />;
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-4">
      <div className="grid gap-2 text-sm">
        {mints.map((mint) => (
          <a key={mint._id} href={getExplorerTxUrl(chainId, mint.txHash)} target="_blank" rel="noreferrer" className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 hover:border-cyan/30 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <span>{short(mint.minterWallet)}</span>
            <span>{mint.quantity} item{mint.quantity > 1 ? "s" : ""}</span>
            <span>{mint.grossAmountToken ?? "0"} {mint.token ?? "ETH"}</span>
            <span className="text-muted">{dateLabel(mint.createdAt)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPanel({ minted, maxSupply, mints, collection }: { minted: number; maxSupply: number; mints: MintActivity[]; collection: Collection }) {
  const gross = mints.reduce((sum, mint) => sum + Number(mint.grossAmountToken ?? 0), 0);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total minted" value={`${minted}/${maxSupply}`} />
      <Metric label="Recent mint txs" value={String(mints.length)} />
      <Metric label="Recent volume" value={`${gross.toFixed(4)} ${collection.mintCurrency}`} />
      <Metric label="Platform fee" value={`${((collection.platformMintFeeBps ?? 0) / 100).toFixed(2)}%`} />
    </div>
  );
}

function AiPanel({ collection, items }: { collection: Collection; items: CollectionItem[] }) {
  const ready = items.filter((item) => item.generationStatus === "metadata_ready").length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-panel p-5">
        <div className="flex items-center gap-2 text-cyan"><Bot size={18} /><p className="font-bold">AI Provenance</p></div>
        <p className="mt-4 text-xs uppercase text-muted">Base prompt</p>
        <p className="mt-1 rounded-lg bg-white/[0.03] p-3">{collection.basePrompt ?? "Unavailable"}</p>
        <p className="mt-4 text-xs uppercase text-muted">Style</p>
        <p className="mt-1 rounded-lg bg-white/[0.03] p-3">{collection.style ?? "Unavailable"}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-panel p-5">
        <div className="flex items-center gap-2 text-lime"><CheckCircle2 size={18} /><p className="font-bold">Metadata Pipeline</p></div>
        <p className="mt-4 text-sm text-muted">Generated items: {items.length}</p>
        <p className="mt-2 text-sm text-muted">Metadata ready: {ready}</p>
        <p className="mt-2 break-all text-sm text-muted">Metadata base: {collection.metadataBaseIpfsUri ?? collection.metadataBaseUri ?? "Unavailable"}</p>
        <p className="mt-2 break-all text-sm text-muted">Cover IPFS: {collection.coverImageIpfsUri ?? "Unavailable"}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-10 text-center text-muted">
      <Clock className="mx-auto mb-3" size={24} />
      {message}
    </div>
  );
}
