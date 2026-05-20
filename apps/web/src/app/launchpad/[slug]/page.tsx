"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEther, parseAbi } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

const launchMintAbi = parseAbi([
  "function publicMint(uint256 quantity) payable",
  "function publicMintPrice() view returns (uint256)",
  "function paused() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)"
]);

function getReadableMintError(error: unknown) {
  if (typeof error === "object" && error && "shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Mint failed";
}

type Collection = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  chainId: number;
  contractAddress: `0x${string}`;
  coverImageUrl?: string;
  maxSupply: number;
  totalMinted: number;
  mintPrice: string;
  mintCurrency: string;
  maxMintPerWallet: number;
  status: string;
  publicMintStartAt?: string;
  publicMintEndAt?: string;
  liveStatus: string;
};

export default function PublicMintPage() {
  const params = useParams<{ slug: string }>();
  const { address, chainId } = useAccount();
  const { selectedChainId, setSelectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const { writeContractAsync, isPending } = useWriteContract();
  const [collection, setCollection] = useState<Collection>();
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
    withMinimumDelay(api<{ collection: Collection }>(`/api/launchpad/collections/${params.slug}`))
      .then((result) => {
        setCollection(result.collection);
        setSelectedChainId(result.collection.chainId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Collection not found"))
      .finally(() => setIsLoading(false));
  }, [params.slug, setSelectedChainId]);

  const maxSupply = typeof contractMaxSupply === "bigint" ? Number(contractMaxSupply) : collection?.maxSupply ?? 0;
  const minted = typeof totalSupply === "bigint" ? Number(totalSupply) : collection?.totalMinted ?? 0;
  const progress = maxSupply ? Math.min((minted / maxSupply) * 100, 100) : 0;
  const now = Date.now();
  const started = !collection?.publicMintStartAt || new Date(collection.publicMintStartAt).getTime() <= now;
  const ended = Boolean(collection?.publicMintEndAt && new Date(collection.publicMintEndAt).getTime() < now);
  const soldOut = collection ? minted >= maxSupply : false;
  const statusAllowsMint = collection ? ["published", "minting_live"].includes(collection.status) : false;
  const priceReady = typeof price === "bigint";
  const canMint = Boolean(collection && address && chainId === collection.chainId && !isWrongNetwork && started && !ended && !soldOut && !paused && statusAllowsMint && priceReady);

  async function mint() {
    try {
      if (!collection) return;
      if (!address) throw new Error("Connect wallet first");
      if (!collection.contractAddress) throw new Error("Collection contract address missing");
      if (!["published", "minting_live"].includes(collection.status)) throw new Error("Collection is not open for public mint");
      if (chainId !== collection.chainId || isWrongNetwork) {
        setStatus("Switching network...");
        await switchToSelectedChain();
        return setStatus("Network switched. Click mint again.");
      }
      if (!publicClient) throw new Error("RPC client is not ready for selected chain");
      if (paused) throw new Error("Collection contract is paused");
      if (typeof price !== "bigint") throw new Error("Mint price unavailable. Refresh the page or check the contract.");
      const mintPrice = price;
      const mintValue = mintPrice * BigInt(quantity);
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
      setStatus("Mint confirmed on-chain.");
    } catch (err) {
      setStatus(undefined);
      setError(getReadableMintError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10">
        {isLoading && <p className="rounded-md border border-cyan/20 bg-cyan/10 p-3 text-cyan">Loading mint campaign...</p>}
        {error && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
        {collection && (
          <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-panel">
              <div className="flex aspect-square items-center justify-center bg-[linear-gradient(135deg,#172554,#0f172a_55%,#14532d)]">
                {collection.coverImageUrl ? <img src={collection.coverImageUrl} alt={collection.name} className="h-full w-full object-cover" /> : <span className="text-muted">No cover image</span>}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-black">{collection.name}</h1>
                  <p className="mt-3 text-muted">{collection.description}</p>
                </div>
                <ChainBadge chainId={collection.chainId} />
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan" style={{ width: `${progress}%` }} /></div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p className="rounded-md bg-white/5 p-3">Minted: {minted}/{maxSupply}</p>
                <p className="rounded-md bg-white/5 p-3">Mint price: {typeof price === "bigint" ? `${formatEther(price)} ${collection.mintCurrency}` : "Mint price unavailable"}</p>
                <p className="break-all rounded-md bg-white/5 p-3 sm:col-span-2">Contract: {collection.contractAddress}</p>
                <p className="rounded-md bg-white/5 p-3">Max per wallet: {collection.maxMintPerWallet}</p>
                <p className="rounded-md bg-white/5 p-3">Status: {soldOut ? "Sold out" : ended ? "Ended" : started ? "Live" : "Scheduled"}</p>
              </div>
              {priceReadError && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">Mint price unavailable: {getReadableMintError(priceReadError)}</p>}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-4 rounded-md border border-cyan/20 bg-cyan/10 p-3 font-mono text-xs text-cyan">
                  <p>selectedChainId: {selectedChainId}</p>
                  <p>walletChainId: {chainId ?? "disconnected"}</p>
                  <p>contractAddress: {collection.contractAddress}</p>
                  <p>mintFunction: publicMint(uint256)</p>
                  <p>mintPrice: {typeof price === "bigint" ? price.toString() : "unavailable"}</p>
                  <p>mintValue: {typeof price === "bigint" ? (price * BigInt(quantity)).toString() : "unavailable"}</p>
                  <p>metadataUri: launchpad base URI on contract</p>
                  <p>paused: {String(Boolean(paused))}</p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ConnectButton />
                <input className="h-11 w-24 rounded-md border border-white/10 bg-black/40 px-3" type="number" min={1} max={collection.maxMintPerWallet} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                <Button disabled={!canMint || isLoading || isPending} onClick={mint}>{isPending || isLoading ? "Minting..." : "Mint"}</Button>
              </div>
              {status && <p className="mt-4 rounded-md border border-lime/30 bg-lime/10 p-3 text-lime">{status}</p>}
              {tokenIds.length ? <p className="mt-4 rounded-md bg-white/5 p-3 text-sm">Minted token IDs: {tokenIds.join(", ")}</p> : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
