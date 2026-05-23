// apps/web/src/app/studio/collection/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Boxes, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { NetworkModeSwitcher } from "@/components/web3/NetworkModeSwitcher";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";
import { useAuthStore } from "@/stores/auth.store";

type GenerationQuote = {
  supply: number;
  estimatedCredits: number;
  estimatedCostUsd: number | null;
  userCredits: number;
  activePlan?: "free" | "starter" | "creator" | "pro" | "enterprise";
  planSource?: "user" | "subscription";
  maxSupplyAllowed?: number;
  maxImageSizeAllowed?: number;
  marketplaceListingEnabled?: boolean;
  launchEnabled?: boolean;
  planAllowsSupply?: boolean;
  planAllowsImageSize?: boolean;
  width?: number;
  height?: number;
  reasons?: string[];
  canGenerate: boolean;
};

type GenerationStatus = {
  collectionId: string;
  status: string;
  stage: string;
  progressCurrent: number;
  progressTotal: number;
  failedCount: number;
  retryable: boolean;
  errorMessage?: string;
  jobStatus?: string;
  metadataBaseIpfsUri?: string;
  imageBaseIpfsUri?: string;
};

type CollectionItem = {
  _id: string;
  tokenNumber: number;
  name: string;
  imageUrl?: string;
  imageIpfsUri?: string;
  rarityTier?: string;
  rarityScore?: number;
  generationStatus?: string;
  errorMessage?: string;
};

const supplyOptions = [10, 100, 1000];

export default function CollectionStudioPage() {
  const { selectedChainId } = useNetworkMode();
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState("Cyber Cats");
  const [symbol, setSymbol] = useState("CCAT");
  const [description, setDescription] = useState("AI generated cyberpunk cat collection by NEXMINT AI");
  const [basePrompt, setBasePrompt] = useState("Cyberpunk cat warriors");
  const [style, setStyle] = useState("premium cyberpunk Web3 collectible");
  const [supply, setSupply] = useState(10);
  const [customSupply, setCustomSupply] = useState("");
  const [mintPrice, setMintPrice] = useState("0.001");
  const [maxMintPerWallet, setMaxMintPerWallet] = useState(5);
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [startAt, setStartAt] = useState("");
  const [imageSize, setImageSize] = useState<512 | 768 | 1024>(768);
  const [quote, setQuote] = useState<GenerationQuote>();
  const [status, setStatus] = useState<GenerationStatus>();
  const [collectionId, setCollectionId] = useState<string>();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const parsedCustomSupply = Number(customSupply);

  const actualSupply =
  customSupply && Number.isFinite(parsedCustomSupply) && parsedCustomSupply > 0
    ? parsedCustomSupply
    : supply;
  const activePlan = quote?.activePlan ?? user?.activePlan ?? user?.plan ?? "free";
  const maxSupplyAllowed = quote?.maxSupplyAllowed ?? user?.planLimits?.maxCollectionSize ?? 0;
  const progressPercent = status?.progressTotal ? Math.min((status.progressCurrent / status.progressTotal) * 100, 100) : 0;
  const complete = Boolean(status?.metadataBaseIpfsUri) || ["metadata_ready", "contract_deployed", "publish_fee_pending", "published", "minting_live", "sold_out"].includes(status?.status ?? "");

  async function refreshQuote(nextSupply = actualSupply) {
    try {
      const result = await api<GenerationQuote>(`/api/collections/generation-quote?supply=${nextSupply}&width=${imageSize}&height=${imageSize}&chainId=${selectedChainId}&provider=replicate`);
      setQuote(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote unavailable");
    }
  }

  useEffect(() => {
    void refreshQuote(actualSupply);
  }, [actualSupply, imageSize, selectedChainId]);

  useEffect(() => {
    if (!collectionId) return;
    const timer = window.setInterval(async () => {
      const next = await api<GenerationStatus>(`/api/collections/${collectionId}/generation-status`);
      setStatus(next);
      const itemResult = await api<{ items: CollectionItem[] }>(`/api/collections/${collectionId}/items?limit=24`);
      setItems(itemResult.items);
      if (["metadata_ready", "ready_to_mint", "failed", "cancelled"].includes(next.status)) {
  window.clearInterval(timer);
}
    }, 5000);
    return () => window.clearInterval(timer);
  }, [collectionId]);

async function generateCollection() {
  try {
    setIsLoading(true);
    setError(undefined);

    if (!name.trim()) {
      setError("Collection name is required.");
      return;
    }

    if (!symbol.trim()) {
      setError("Collection symbol is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!basePrompt.trim()) {
      setError("Base prompt is required.");
      return;
    }

    if (!Number.isFinite(actualSupply) || actualSupply < 1 || actualSupply > 10000) {
      setError("Supply must be between 1 and 10,000.");
      return;
    }

    if (!Number.isFinite(maxMintPerWallet) || maxMintPerWallet < 1) {
      setError("Max mint per wallet must be at least 1.");
      return;
    }

    if (!Number.isFinite(royaltyBps) || royaltyBps < 0 || royaltyBps > 1000) {
      setError("Royalty must be between 0 and 1000 bps.");
      return;
    }

    const result = await withMinimumDelay(
      api<{ collectionId: string; jobId: string; status: string }>("/api/collections/generate", {
        method: "POST",
        body: JSON.stringify({
          name,
          symbol,
          description,
          basePrompt,
          style,
          supply: actualSupply,
          chainId: selectedChainId,
          mintPrice,
          maxMintPerWallet,
          royaltyBps,
          width: imageSize,
          height: imageSize,
          publicMintStartAt: startAt ? new Date(startAt).toISOString() : undefined
        })
      })
    );

    setCollectionId(result.collectionId);
    setStatus({
      collectionId: result.collectionId,
      status: result.status,
      stage: "create_traits",
      progressCurrent: 0,
      progressTotal: actualSupply,
      failedCount: 0,
      retryable: false
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : "Collection generation failed");
  } finally {
    setIsLoading(false);
  }
}

  async function control(action: "pause-generation" | "resume-generation" | "cancel-generation") {
    if (!collectionId) return;
    await api(`/api/collections/${collectionId}/${action}`, { method: "POST" });
    const next = await api<GenerationStatus>(`/api/collections/${collectionId}/generation-status`);
    setStatus(next);
  }

  async function retryFailed() {
    if (!collectionId) return;
    await api(`/api/collections/${collectionId}/retry-failed`, { method: "POST" });
    const next = await api<GenerationStatus>(`/api/collections/${collectionId}/generation-status`);
    setStatus(next);
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-cyan">Collection Generator</p>
              <h1 className="mt-2 text-4xl font-black">Pre-generate Launchpad Collection</h1>
              <p className="mt-3 max-w-3xl text-sm text-muted">Generate all images and metadata first, upload them to IPFS, then deploy ERC721A and open public mint.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/studio" className="rounded-md border border-white/10 px-4 py-3 text-sm hover:bg-white/10">Single NFT</Link>
              <NetworkModeSwitcher />
            </div>
          </div>

          {error && <p className="mt-6 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}

          <div className="mt-8 grid gap-6 lg:grid-cols-[430px_1fr]">
            <div className="space-y-5 rounded-xl border border-white/10 bg-panel p-5">
              <div className="flex items-center gap-2 font-bold"><Sparkles size={18} /> Collection Settings</div>
              <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Active plan</span>
                  <span className="rounded-full border border-cyan/30 bg-cyan/15 px-3 py-1 text-xs font-black uppercase text-cyan">{activePlan}</span>
                </div>
                <p className="mt-2 text-xs text-muted">Public collection limit: {maxSupplyAllowed} NFTs{quote?.planSource ? ` (${quote.planSource})` : ""}</p>
              </div>
              <label className="block text-sm text-muted">Collection Name<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="block text-sm text-muted">Symbol<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label>
              <label className="block text-sm text-muted">Description<textarea className="mt-2 min-h-24 w-full rounded-md bg-black/40 p-3 text-white" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
              <label className="block text-sm text-muted">Base Prompt<textarea className="mt-2 min-h-24 w-full rounded-md bg-black/40 p-3 text-white" value={basePrompt} onChange={(event) => setBasePrompt(event.target.value)} /></label>
              <label className="block text-sm text-muted">Style<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={style} onChange={(event) => setStyle(event.target.value)} /></label>
              <div>
                <p className="text-sm text-muted">Supply</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {supplyOptions.map((option) => <button key={option} className={`rounded-md border px-3 py-2 text-sm ${actualSupply === option && !customSupply ? "border-cyan bg-cyan/10 text-cyan" : "border-white/10"}`} onClick={() => { setSupply(option); setCustomSupply(""); }}>{option}</button>)}
                  <input className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm" placeholder="Custom" value={customSupply} onChange={(event) => setCustomSupply(event.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted">Image size</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([512, 768, 1024] as const).map((option) => (
                    <button
                      key={option}
                      className={`rounded-md border px-3 py-2 text-sm ${imageSize === option ? "border-cyan bg-cyan/10 text-cyan" : "border-white/10"}`}
                      onClick={() => setImageSize(option)}
                      type="button"
                    >
                      {option}px
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-muted">Mint Price<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={mintPrice} onChange={(event) => setMintPrice(event.target.value)} /></label>
                <label className="block text-sm text-muted">Max Per Wallet<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="number" value={maxMintPerWallet} onChange={(event) => setMaxMintPerWallet(Number(event.target.value))} /></label>
                <label className="block text-sm text-muted">Royalty BPS<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="number" value={royaltyBps} onChange={(event) => setRoyaltyBps(Number(event.target.value))} /></label>
                <label className="block text-sm text-muted">Start Time<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
              </div>
              <div className="rounded-md border border-cyan/20 bg-cyan/10 p-3 text-sm">
                <p>Estimated credits: {quote?.estimatedCredits ?? actualSupply}</p>
                <p>User credits: {quote?.userCredits ?? "Loading"}</p>
                <p>Selected image size: {quote?.width ?? imageSize}px</p>
                <p>Plan max image size: {quote?.maxImageSizeAllowed ?? user?.planLimits?.maxImageSize ?? "unknown"}px</p>
                <p>Launchpad publish: {quote?.launchEnabled ? "enabled" : "not included"}</p>
                <p>Marketplace listing: {quote?.marketplaceListingEnabled ? "enabled" : "external links only"}</p>
                {quote && quote.launchEnabled && !quote.planAllowsSupply && <p className="mt-2 text-rose">Your {quote.activePlan} plan supports up to {quote.maxSupplyAllowed} NFTs per public collection.</p>}
                {quote?.reasons?.map((reason) => <p key={reason} className="mt-2 text-rose">{reason}</p>)}
              </div>
              <Button className="w-full" disabled={isLoading || Boolean(quote && !quote.canGenerate) || Boolean(collectionId)} onClick={generateCollection}>
                {isLoading ? "Starting..." : `Generate ${actualSupply} Collection`}
              </Button>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">Generation Progress</p>
                    <h2 className="text-2xl font-black">{status ? `${status.progressCurrent} / ${status.progressTotal}` : "No collection job yet"}</h2>
                  </div>
                  <ChainBadge chainId={selectedChainId} />
                </div>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-cyan transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <Info label="Status" value={status?.status ?? "empty"} />
                  <Info label="Stage" value={status?.stage ?? "not started"} />
                  <Info label="Failed" value={String(status?.failedCount ?? 0)} />
                  <Info label="Metadata" value={status?.metadataBaseIpfsUri ? "ready" : "pending"} />
                </div>
                {status?.errorMessage && (
                  <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{status.errorMessage}</p>
                )}
                {collectionId && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button className="border border-white/10 bg-transparent text-white" onClick={() => void control("pause-generation")}><Pause size={16} /> Pause</Button>
                    <Button className="border border-white/10 bg-transparent text-white" onClick={() => void control("resume-generation")}><Play size={16} /> Resume</Button>
                    <Button className="border border-white/10 bg-transparent text-white" disabled={!status?.failedCount} onClick={() => void retryFailed()}><RotateCcw size={16} /> Retry Failed</Button>
                    <Button className="border border-white/10 bg-transparent text-white" onClick={() => void control("cancel-generation")}><RotateCcw size={16} /> Cancel</Button>
                    <Link href={`/collections/${collectionId}/manage`}><Button disabled={!complete}>Deploy / Publish</Button></Link>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-panel p-5">
                <div className="mb-4 flex items-center gap-2 font-bold"><Boxes size={18} /> Generated Items</div>
                {!items.length ? <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">No generated items yet.</p> : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {items.map((item) => (
                      <div key={item._id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                        <div className="aspect-square overflow-hidden rounded bg-black/40">
                          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted">{item.generationStatus ?? "pending"}</div>}
                        </div>
                        <p className="mt-3 font-bold">#{item.tokenNumber} {item.rarityTier ?? ""}</p>
                        <p className="text-xs text-muted">{item.generationStatus}{item.errorMessage ? `: ${item.errorMessage}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </AuthGuard>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
