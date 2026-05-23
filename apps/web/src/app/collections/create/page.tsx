// apps/web/src/app/collections/create/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SUPPORTED_TESTNET_CHAINS } from "@/config/chains";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type GenerationQuote = {
  supply: number;
  estimatedCredits: number;
  userCredits: number;
  activePlan?: "free" | "starter" | "pro" | "enterprise";
  maxSupplyAllowed?: number;
  launchEnabled?: boolean;
  planAllowsSupply?: boolean;
  canGenerate: boolean;
};

const supplyPresets = [10, 100, 1000];

export default function CreateCollectionPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [form, setForm] = useState({
    name: "Cyber Cats",
    symbol: "CCAT",
    description: "AI generated cyberpunk cat collection",
    maxSupply: 1000,
    mintPrice: "0.001",
    chainId: 84532,
    maxMintPerWallet: 5,
    royaltyBps: 500,
    metadataBaseUri: "",
    placeholderUri: "",
    coverImageUrl: "",
    publicMintStartAt: new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16),
    publicMintEndAt: ""
  });
  const [customSupply, setCustomSupply] = useState("");
  const [quote, setQuote] = useState<GenerationQuote>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadQuote() {
      try {
        const result = await api<GenerationQuote>(`/api/collections/generation-quote?supply=${form.maxSupply}&provider=replicate`);
        if (!cancelled) setQuote(result);
      } catch {
        if (!cancelled) setQuote(undefined);
      }
    }
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [form.maxSupply]);

  function updateSupply(value: number) {
    update("maxSupply", value);
    setCustomSupply("");
  }

  function updateCustomSupply(value: string) {
    setCustomSupply(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) update("maxSupply", parsed);
  }

  async function submit() {
    try {
      setIsLoading(true);
      setError(undefined);
      if (!Number.isFinite(form.maxSupply) || form.maxSupply < 1) throw new Error("Supply must be at least 1.");
      if (quote?.launchEnabled === false) throw new Error("Your active plan cannot create public launchpad collections yet.");
      if (quote?.planAllowsSupply === false) throw new Error(`Your active plan supports up to ${quote.maxSupplyAllowed ?? 0} NFTs per public collection.`);
      const payload = {
        ...form,
        publicMintStartAt: new Date(form.publicMintStartAt).toISOString(),
        publicMintEndAt: form.publicMintEndAt ? new Date(form.publicMintEndAt).toISOString() : undefined,
        payoutWallet: address
      };
      const result = await withMinimumDelay(api<{ collectionId: string }>("/api/collections", { method: "POST", body: JSON.stringify(payload) }));
      router.push(`/collections/${result.collectionId}/manage`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection creation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
        <section className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm font-semibold uppercase text-cyan">Creator Launch Wizard</p>
          <h1 className="mt-2 text-4xl font-black">Create Public Mint Campaign</h1>
          <div className="mt-6 rounded-lg border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan">
            <p className="font-semibold">This page creates a draft campaign only.</p>
            <p className="mt-2 text-muted">Deploy unlocks after the collection has real generated items and metadata files on IPFS. For AI pre-generated collections, use Collection Studio first so NEXMINT creates 1.json through maxSupply.json.</p>
            <Link className="mt-3 inline-flex rounded-md border border-cyan/30 px-4 py-2 font-semibold text-cyan hover:bg-cyan/10" href="/studio/collection">Generate assets in Collection Studio</Link>
          </div>
          <div className="mt-8 grid gap-5 rounded-lg border border-white/10 bg-panel p-6 md:grid-cols-2">
            <label className="text-sm text-muted">Name<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="text-sm text-muted">Symbol<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.symbol} onChange={(event) => update("symbol", event.target.value.toUpperCase())} /></label>
            <label className="text-sm text-muted md:col-span-2">Description<textarea className="mt-2 min-h-24 w-full rounded-md bg-black/40 p-3 text-white" value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
            <div className="text-sm text-muted">
              <p>Max supply</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {supplyPresets.map((value) => (
                  <button
                    className={`rounded-md border px-3 py-2 ${form.maxSupply === value && !customSupply ? "border-cyan bg-cyan/10 text-cyan" : "border-white/10 bg-black/40 text-white"}`}
                    key={value}
                    type="button"
                    onClick={() => updateSupply(value)}
                  >
                    {value}
                  </button>
                ))}
                <input className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white" placeholder="Custom" type="number" min={1} value={customSupply} onChange={(event) => updateCustomSupply(event.target.value)} />
              </div>
              <p className="mt-2 text-xs text-muted">Selected supply: {form.maxSupply}</p>
            </div>
            <label className="text-sm text-muted">Mint price<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.mintPrice} onChange={(event) => update("mintPrice", event.target.value)} /></label>
            <label className="text-sm text-muted">Chain<select className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.chainId} onChange={(event) => update("chainId", Number(event.target.value))}>
              {SUPPORTED_TESTNET_CHAINS.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
            </select></label>
            <label className="text-sm text-muted">Max mint per wallet<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="number" min={1} value={form.maxMintPerWallet} onChange={(event) => update("maxMintPerWallet", Number(event.target.value))} /></label>
            <label className="text-sm text-muted">Royalty bps<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="number" min={0} max={1000} value={form.royaltyBps} onChange={(event) => update("royaltyBps", Number(event.target.value))} /></label>
            <label className="text-sm text-muted">Cover image URL<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.coverImageUrl} onChange={(event) => update("coverImageUrl", event.target.value)} /></label>
            <label className="text-sm text-muted md:col-span-2">Metadata base URI<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" placeholder="ipfs://CID/" value={form.metadataBaseUri} onChange={(event) => update("metadataBaseUri", event.target.value)} /></label>
            <label className="text-sm text-muted md:col-span-2">Placeholder URI<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.placeholderUri} onChange={(event) => update("placeholderUri", event.target.value)} /></label>
            <label className="text-sm text-muted">Mint start<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="datetime-local" value={form.publicMintStartAt} onChange={(event) => update("publicMintStartAt", event.target.value)} /></label>
            <label className="text-sm text-muted">Mint end optional<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" type="datetime-local" value={form.publicMintEndAt} onChange={(event) => update("publicMintEndAt", event.target.value)} /></label>
            <div className="md:col-span-2 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p><span className="text-muted">Active plan:</span> <span className="font-semibold uppercase text-cyan">{quote?.activePlan ?? "loading"}</span></p>
              <p><span className="text-muted">Plan public supply limit:</span> {quote?.maxSupplyAllowed ?? "loading"}</p>
              <p><span className="text-muted">Draft deploy readiness:</span> deploy requires generated NFTItem metadata, not only filled fields.</p>
              {quote && !quote.launchEnabled && <p className="mt-2 text-rose">Your current plan cannot publish public launchpad collections.</p>}
              {quote && quote.launchEnabled && !quote.planAllowsSupply && <p className="mt-2 text-rose">This supply exceeds your plan limit.</p>}
            </div>
            {error && <p className="md:col-span-2 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
            <Button className="md:col-span-2" disabled={isLoading || Boolean(quote && (!quote.launchEnabled || !quote.planAllowsSupply))} onClick={submit}>{isLoading ? "Creating..." : "Create Draft Collection"}</Button>
          </div>
        </section>
      </AuthGuard>
    </main>
  );
}
