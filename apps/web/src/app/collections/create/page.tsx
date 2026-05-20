// apps/web/src/app/collections/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SUPPORTED_TESTNET_CHAINS } from "@/config/chains";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

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
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    try {
      setIsLoading(true);
      setError(undefined);
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
          <div className="mt-8 grid gap-5 rounded-lg border border-white/10 bg-panel p-6 md:grid-cols-2">
            <label className="text-sm text-muted">Name<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="text-sm text-muted">Symbol<input className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.symbol} onChange={(event) => update("symbol", event.target.value.toUpperCase())} /></label>
            <label className="text-sm text-muted md:col-span-2">Description<textarea className="mt-2 min-h-24 w-full rounded-md bg-black/40 p-3 text-white" value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
            <label className="text-sm text-muted">Max supply<select className="mt-2 w-full rounded-md bg-black/40 p-3 text-white" value={form.maxSupply} onChange={(event) => update("maxSupply", Number(event.target.value))}>
              {[10, 100, 1000].map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
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
            {error && <p className="md:col-span-2 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
            <Button className="md:col-span-2" disabled={isLoading} onClick={submit}>{isLoading ? "Creating..." : "Create Collection"}</Button>
          </div>
        </section>
      </AuthGuard>
    </main>
  );
}
