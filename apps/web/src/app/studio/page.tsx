"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Bot, ImageIcon, Sparkles } from "lucide-react";
import { formatEther, isAddress, parseAbi } from "viem";
import { useAccount, usePublicClient, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { NetworkStatusCard } from "@/components/web3/NetworkStatusCard";
import { GenerationProgressCard } from "@/components/generation/GenerationProgressCard";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

type ProviderInfo = {
  name: string;
  capabilities: string[];
  configured: boolean;
  active: boolean;
  freeTier: boolean;
};

type GenerationStatus = {
  id: string;
  status: string;
  progress: number;
  imageUrl?: string;
  imageIpfsUri?: string;
  metadataIpfsUri?: string;
  nftItemId?: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  provider?: string;
  usedFallback?: boolean;
  error: string | null;
};

type PreparedNft = {
  nftItemId: string;
  status: "ready_to_mint";
  imageIpfsUri: string;
  metadataIpfsUri: string;
  metadataGatewayUrl: string;
  nftItem: {
    name: string;
    description: string;
    contractAddress?: `0x${string}`;
    attributes: Array<{ trait_type: string; value: string | number }>;
  };
};

const mintAbi = parseAbi([
  "function mintTo(address to,string uri) payable returns (uint256)",
  "function publicPrice() view returns (uint256)",
  "function paused() view returns (bool)"
]);

function getReadableMintError(error: unknown) {
  if (typeof error === "object" && error && "shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Mint failed";
}

export default function StudioPage() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, isPending: isMintPending } = useWriteContract();
  const { selectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const [singleMintContractInput, setSingleMintContractInput] = useState("");
  const [prompt, setPrompt] = useState("Cyberpunk cat with chrome whiskers and a neon kimono");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [textProvider, setTextProvider] = useState("openrouter");
  const [imageProvider, setImageProvider] = useState("replicate");
  const [model, setModel] = useState("black-forest-labs/flux-schnell");
  const [status, setStatus] = useState("Idle");
  const [generationId, setGenerationId] = useState<string>();
  const [generation, setGeneration] = useState<GenerationStatus>();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [nftName, setNftName] = useState("Cyberpunk Cat #1");
  const [nftDescription, setNftDescription] = useState("AI generated NFT from NEXMINT AI");
  const [traits, setTraits] = useState<Array<{ trait_type: string; value: string }>>([
    { trait_type: "Style", value: "Cyberpunk" },
    { trait_type: "Origin", value: "NEXMINT AI" }
  ]);
  const [preparedNft, setPreparedNft] = useState<PreparedNft>();
  const [mintResult, setMintResult] = useState<{ tokenId: string; txHash: string; explorerUrl: string }>();
  const [actionLoading, setActionLoading] = useState(false);
  const [mintError, setMintError] = useState<string>();
  const [mintPriceError, setMintPriceError] = useState<string>();
  const mintContractAddress = (preparedNft?.nftItem.contractAddress && isAddress(preparedNft.nftItem.contractAddress)
    ? preparedNft.nftItem.contractAddress
    : isAddress(singleMintContractInput)
      ? singleMintContractInput
      : undefined) as `0x${string}` | undefined;
  const { data: publicPrice, error: publicPriceReadError } = useReadContract({
    address: mintContractAddress,
    abi: mintAbi,
    functionName: "publicPrice",
    chainId: selectedChainId,
    query: { enabled: Boolean(mintContractAddress) }
  });
  const { data: paused } = useReadContract({
    address: mintContractAddress,
    abi: mintAbi,
    functionName: "paused",
    chainId: selectedChainId,
    query: { enabled: Boolean(mintContractAddress) }
  });

  async function ensureWalletSession() {
    if (!address) throw new Error("Connect wallet first");
    const existing = localStorage.getItem("nexmint_token");
    if (existing) return existing;
    setStatus("Signing wallet login");
    const nonce = await withMinimumDelay(api<{ message: string }>("/api/auth/wallet/nonce", {
      method: "POST",
      body: JSON.stringify({ address })
    }));
    const signature = await signMessageAsync({ message: nonce.message });
    const session = await withMinimumDelay(api<{ token: string }>("/api/auth/wallet", {
      method: "POST",
      body: JSON.stringify({ address, signature, chainId, connector: "walletconnect" })
    }));
    localStorage.setItem("nexmint_token", session.token);
    return session.token;
  }

  useEffect(() => {
    api<{ providers: ProviderInfo[] }>("/api/ai/providers")
      .then((result) => setProviders(result.providers))
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    setMintPriceError(publicPriceReadError ? getReadableMintError(publicPriceReadError) : undefined);
  }, [publicPriceReadError]);

  useEffect(() => {
    if (!generationId) return;
    const timer = window.setInterval(async () => {
      const result = await api<GenerationStatus>(`/api/ai/generation/${generationId}`);
      setGeneration(result);
      setStatus(labelForStatus(result.status));
      setUsedFallback(Boolean(result.usedFallback));
      if (result.enhancedPrompt) setEnhancedPrompt(result.enhancedPrompt);
      if (result.negativePrompt) setNegativePrompt(result.negativePrompt);
      if (result.nftItemId && !preparedNft) {
        setPreparedNft((current) => current ?? {
          nftItemId: result.nftItemId!,
          status: "ready_to_mint",
          imageIpfsUri: result.imageIpfsUri ?? "",
          metadataIpfsUri: result.metadataIpfsUri ?? "",
          metadataGatewayUrl: "",
          nftItem: { name: nftName, description: nftDescription, attributes: traits }
        });
      }
      if (["image_ready", "ready_to_mint", "minted", "failed", "cancelled"].includes(result.status)) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [generationId]);

  async function enhance() {
    try {
      setActionLoading(true);
      await ensureWalletSession();
      setStatus("Enhancing prompt");
      const result = await withMinimumDelay(api<{ enhancedPrompt: string; negativePrompt: string; provider: string; usedFallback: boolean }>("/api/ai/enhance-prompt", {
        method: "POST",
        body: JSON.stringify({ prompt, style: "premium Web3 collectible", collectionTheme: "futuristic AI NFT collection" })
      }));
      setEnhancedPrompt(result.enhancedPrompt);
      setNegativePrompt(result.negativePrompt);
      setTextProvider(result.provider);
      setUsedFallback(result.usedFallback);
      setStatus("Prompt enhanced");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Enhancement failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function generate() {
    try {
      setActionLoading(true);
      await ensureWalletSession();
      setStatus("Queueing generation");
      const result = await withMinimumDelay(api<{ generationId: string; status: string }>("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({
          prompt: enhancedPrompt || prompt,
          negativePrompt,
          provider: imageProvider,
          model: model || undefined,
          width: 1024,
          height: 1024
        })
      }));
      setGenerationId(result.generationId);
      setPreparedNft(undefined);
      setMintResult(undefined);
      setStatus("Queued");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function prepareNft() {
    try {
      setActionLoading(true);
      await ensureWalletSession();
      if (!generationId) throw new Error("Generate an image first");
      if (!generation?.imageUrl) throw new Error("Image is not ready yet");
      setStatus("Uploading image to IPFS");
      const result = await withMinimumDelay(api<PreparedNft>("/api/nft/prepare-from-generation", {
        method: "POST",
        body: JSON.stringify({
          generationId,
          name: nftName,
          description: nftDescription,
          attributes: traits.filter((trait) => trait.trait_type.trim() && trait.value.trim())
        })
      }));
      setPreparedNft(result);
      setStatus("NFT Metadata Ready");
      setGeneration((current) => current ? { ...current, status: "ready_to_mint", progress: 95, imageIpfsUri: result.imageIpfsUri, metadataIpfsUri: result.metadataIpfsUri, nftItemId: result.nftItemId } : current);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "NFT preparation failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function mintNft() {
    try {
      setActionLoading(true);
      setMintError(undefined);
      await ensureWalletSession();
      if (!address) throw new Error("Connect wallet first");
      if (!preparedNft?.metadataIpfsUri) throw new Error("Prepare NFT metadata first");
      const contractAddress = mintContractAddress;
      if (!contractAddress) throw new Error("Select a single NFT minter contract. Studio mint never uses the NFT factory.");
      if (paused) throw new Error("Collection contract is paused.");
      if (chainId !== selectedChainId || isWrongNetwork) {
        setStatus("Switching network");
        await switchToSelectedChain();
        return setStatus("Network switched. Click Mint NFT again.");
      }
      if (!publicClient) throw new Error("RPC client is not ready for selected chain");
      if (typeof publicPrice !== "bigint") throw new Error("Mint price unavailable. The selected contract must expose publicPrice().");
      const mintValue = publicPrice;
      setStatus("Simulating mint");
      try {
        await publicClient.simulateContract({
          account: address,
          address: contractAddress,
          abi: mintAbi,
          functionName: "mintTo",
          args: [address, preparedNft.metadataIpfsUri],
          value: mintValue
        });
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[NEXMINT] Studio mint simulation failed", error);
        throw new Error(`Mint simulation failed: ${getReadableMintError(error)}`);
      }
      setStatus("Opening wallet");
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: mintAbi,
        functionName: "mintTo",
        args: [address, preparedNft.metadataIpfsUri],
        value: mintValue
      });
      setStatus("Verifying mint transaction");
      setGeneration((current) => current ? { ...current, status: "verifying_mint", progress: 99 } : current);
      const verified = await withMinimumDelay(api<{ status: "minted"; tokenId: string; txHash: string; explorerUrl: string }>("/api/nft/verify-mint", {
        method: "POST",
        body: JSON.stringify({
          nftItemId: preparedNft.nftItemId,
          chainId: selectedChainId,
          contractAddress,
          txHash,
          mintValue: mintValue.toString()
        })
      }));
      setMintResult({ tokenId: verified.tokenId, txHash: verified.txHash, explorerUrl: verified.explorerUrl });
      setGeneration((current) => current ? { ...current, status: "minted", progress: 100 } : current);
      setStatus("NFT Minted");
    } catch (error) {
      const message = getReadableMintError(error);
      setMintError(message);
      setStatus(message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-cyan">Backend-only AI providers</p>
            <h1 className="mt-2 text-4xl font-black">AI Generator Studio</h1>
          </div>
          <div className="flex rounded-md border border-white/10 bg-white/[0.03] p-1 text-sm">
            <span className="rounded bg-cyan px-3 py-2 font-semibold text-slate-950">Single NFT</span>
            <Link className="rounded px-3 py-2 text-cyan hover:bg-cyan/10" href="/studio/collection">Collection Generator</Link>
          </div>
          <div className="rounded-md border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime">Free Tier Mode</div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[440px_1fr]">
          <div className="space-y-5">
            <NetworkStatusCard />
            <div className="rounded-lg border border-white/10 bg-panel p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold"><Sparkles size={18} /> Prompt</div>
              <textarea className="min-h-32 w-full rounded-md border border-white/10 bg-black/40 p-3" maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <Button className="mt-4 w-full" disabled={actionLoading} onClick={enhance}>{actionLoading && status === "Enhancing prompt" ? "Enhancing..." : "Enhance Prompt"}</Button>
              {enhancedPrompt && (
                <div className="mt-4 rounded-md bg-white/5 p-3 text-sm text-slate-300">
                  <p className="font-semibold text-white">Enhanced</p>
                  <p className="mt-2">{enhancedPrompt}</p>
                  <p className="mt-3 font-semibold text-white">Negative</p>
                  <p className="mt-2">{negativePrompt}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-panel p-5">
              <div className="mb-4 flex items-center gap-2 font-semibold"><Bot size={18} /> Provider Settings</div>
              <div className="space-y-3">
                <label className="block text-sm text-muted">Text Provider</label>
                <select className="w-full rounded-md bg-black/40 p-3" value={textProvider} onChange={(e) => setTextProvider(e.target.value)}>
                  <option value="openrouter">OpenRouter Free</option>
                  <option value="local-template-fallback">Local Fallback</option>
                </select>
                <label className="block text-sm text-muted">Image Provider</label>
                <select className="w-full rounded-md bg-black/40 p-3" value={imageProvider} onChange={(e) => setImageProvider(e.target.value)}>
                  <option value="replicate">Replicate</option>
                  <option value="huggingface">HuggingFace</option>
                  <option value="comfyui">ComfyUI</option>
                  <option value="flux">FLUX</option>
                </select>
                <label className="block text-sm text-muted">Model</label>
                <input className="w-full rounded-md bg-black/40 p-3" value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
              <Button className="mt-4 w-full" disabled={actionLoading} onClick={generate}>{actionLoading && status === "Queueing generation" ? "Queueing..." : "Generate NFT"}</Button>
            </div>
          </div>

          <div className="space-y-5">
            <GenerationProgressCard status={generation?.status ?? "pending"} progress={generation?.progress ?? 0} usedFallback={usedFallback} />

            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(135deg,#172554,#0f172a_55%,#14532d)]">
                {generation?.imageUrl ? <img src={generation.imageUrl} alt="Generated NFT" className="h-full w-full rounded-lg object-cover" /> : <ImageIcon className="text-cyan" size={64} />}
              </div>
              <div className="rounded-lg border border-white/10 bg-panel p-5">
                <h3 className="font-bold">Availability</h3>
                <div className="mt-4 space-y-3">
                  {providers.map((provider) => (
                    <div key={provider.name} className="rounded-md bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold capitalize">{provider.name}</span>
                        {provider.configured ? <BadgeCheck size={16} className="text-lime" /> : <span className="text-xs text-muted">config needed</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted">{provider.capabilities.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {generation?.imageUrl && (
              <div className="rounded-lg border border-white/10 bg-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">NFT pipeline</p>
                    <h3 className="text-2xl font-bold">{preparedNft ? "NFT Metadata Ready" : "Prepare NFT Metadata"}</h3>
                  </div>
                  {mintResult && <span className="rounded-md border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime">Minted token #{mintResult.tokenId}</span>}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-muted">
                    Name
                    <input className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={nftName} onChange={(event) => setNftName(event.target.value)} />
                  </label>
                  <label className="block text-sm text-muted">
                    Description
                    <input className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={nftDescription} onChange={(event) => setNftDescription(event.target.value)} />
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold">Traits</p>
                  {traits.map((trait, index) => (
                    <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <input className="rounded-md border border-white/10 bg-black/40 p-3" value={trait.trait_type} onChange={(event) => setTraits((items) => items.map((item, i) => i === index ? { ...item, trait_type: event.target.value } : item))} />
                      <input className="rounded-md border border-white/10 bg-black/40 p-3" value={trait.value} onChange={(event) => setTraits((items) => items.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} />
                      <button type="button" className="rounded-md border border-white/10 px-3 text-sm text-muted hover:text-white" onClick={() => setTraits((items) => items.filter((_, i) => i !== index))}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="rounded-md border border-cyan/30 px-3 py-2 text-sm text-cyan" onClick={() => setTraits((items) => [...items, { trait_type: "", value: "" }])}>Add Trait</button>
                </div>

                <div className="mt-5 grid gap-3 text-sm">
                  <label className="block text-sm text-muted">
                    Single NFT minter contract
                    <input
                      className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white"
                      placeholder="0x... contract with mintTo(address,string)"
                      value={singleMintContractInput}
                      onChange={(event) => setSingleMintContractInput(event.target.value)}
                    />
                    <span className="mt-1 block text-xs text-muted">Do not paste the factory address. Use a collection/minter contract that supports public tokenURI minting.</span>
                  </label>
                  {preparedNft?.imageIpfsUri && <p className="break-all rounded-md bg-white/5 p-3"><span className="text-muted">Image IPFS:</span> {preparedNft.imageIpfsUri}</p>}
                  {preparedNft?.metadataIpfsUri && <p className="break-all rounded-md bg-white/5 p-3"><span className="text-muted">Metadata IPFS:</span> {preparedNft.metadataIpfsUri}</p>}
                  {mintContractAddress && <p className="break-all rounded-md bg-white/5 p-3"><span className="text-muted">Mint contract:</span> {mintContractAddress}</p>}
                  <p className="rounded-md bg-white/5 p-3">
                    <span className="text-muted">Mint price:</span> {typeof publicPrice === "bigint" ? `${formatEther(publicPrice)} ETH` : mintContractAddress ? "Mint price unavailable" : "Select minter contract"}
                    {paused ? <span className="ml-2 text-rose">Contract paused</span> : null}
                  </p>
                  {mintPriceError && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">Mint price unavailable: {mintPriceError}</p>}
                  {mintError && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{mintError}</p>}
                  {process.env.NODE_ENV === "development" && (
                    <div className="rounded-md border border-cyan/20 bg-cyan/10 p-3 font-mono text-xs text-cyan">
                      <p>selectedChainId: {selectedChainId}</p>
                      <p>walletChainId: {chainId ?? "disconnected"}</p>
                      <p>contractAddress: {mintContractAddress ?? "none"}</p>
                      <p>mintFunction: mintTo(address,string)</p>
                      <p>mintPrice: {typeof publicPrice === "bigint" ? publicPrice.toString() : "unavailable"}</p>
                      <p>mintValue: {typeof publicPrice === "bigint" ? publicPrice.toString() : "unavailable"}</p>
                      <p>metadataUri: {preparedNft?.metadataIpfsUri ?? "none"}</p>
                      <p>paused: {String(Boolean(paused))}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={prepareNft} disabled={actionLoading || !generation?.imageUrl || Boolean(preparedNft)}>{actionLoading && status === "Uploading image to IPFS" ? "Preparing..." : "Prepare NFT Metadata"}</Button>
                  <Button onClick={mintNft} disabled={actionLoading || !preparedNft || !mintContractAddress || typeof publicPrice !== "bigint" || Boolean(paused) || isMintPending || Boolean(mintResult)}>
                    {isMintPending || (actionLoading && ["Minting", "Verifying mint transaction"].includes(status)) ? "Minting..." : "Mint NFT"}
                  </Button>
                  {mintResult && <a className="rounded-md border border-cyan/40 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10" href={mintResult.explorerUrl} target="_blank" rel="noreferrer">View Transaction</a>}
                  {mintResult && preparedNft?.nftItemId && <Link className="rounded-md border border-lime/40 px-4 py-2 text-sm font-semibold text-lime hover:bg-lime/10" href={`/nft/${preparedNft.nftItemId}`}>View NFT Result</Link>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      </AuthGuard>
    </main>
  );
}

function labelForStatus(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    enhancing_prompt: "Enhancing prompt",
    generating_image: "Generating image",
    uploading_ipfs: "Uploading",
    image_ready: "Image Ready",
    uploading_image_ipfs: "Uploading image to IPFS",
    generating_metadata: "Generating metadata",
    uploading_metadata_ipfs: "Uploading metadata to IPFS",
    ready_to_mint: "NFT Metadata Ready",
    minting: "Minting",
    minted: "NFT Minted",
    failed: "Failed"
  };
  return labels[status] ?? status;
}
