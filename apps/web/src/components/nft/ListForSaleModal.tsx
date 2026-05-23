"use client";

import { useMemo, useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { erc721ApprovalAbi, getMarketplaceAddress, marketplaceAbi } from "@/lib/web3/marketplace";
import { useAuthStore } from "@/stores/auth.store";

type ListForSaleModalProps = {
  open: boolean;
  onClose: () => void;
  nft: {
    name: string;
    imageUrl?: string;
    imageGatewayUrl?: string;
    chainId?: number;
    contractAddress?: string;
    tokenId?: string | number;
  };
  onListed?: () => void;
};

export function ListForSaleModal({ open, onClose, nft, onListed }: ListForSaleModalProps) {
  const { address } = useAccount();
  const user = useAuthStore((state) => state.user);
  const { writeContractAsync, isPending } = useWriteContract();
  const [priceEth, setPriceEth] = useState("0.01");
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const marketplaceAddress = getMarketplaceAddress(nft.chainId);
  const image = nft.imageGatewayUrl ?? nft.imageUrl;
  const canReadApproval = Boolean(address && marketplaceAddress && nft.contractAddress);
  const { data: approved, refetch } = useReadContract({
    address: nft.contractAddress as Address | undefined,
    abi: erc721ApprovalAbi,
    functionName: "isApprovedForAll",
    args: address && marketplaceAddress ? [address, marketplaceAddress] : undefined,
    chainId: nft.chainId,
    query: { enabled: canReadApproval }
  });

  const marketplaceAllowed = Boolean(user?.planLimits?.marketplaceListingEnabled);
  const canList = useMemo(() => Boolean(
    marketplaceAllowed && address && marketplaceAddress && nft.chainId && nft.contractAddress && nft.tokenId !== undefined && Number(priceEth) > 0
  ), [marketplaceAllowed, address, marketplaceAddress, nft.chainId, nft.contractAddress, nft.tokenId, priceEth]);

  if (!open) return null;

  async function list() {
    try {
      setError(undefined);
      if (!marketplaceAllowed) throw new Error("Marketplace listing requires Creator or Pro.");
      if (!canList || !marketplaceAddress || !nft.chainId || !nft.contractAddress || nft.tokenId === undefined) {
        throw new Error("NFT, wallet, or marketplace config is incomplete");
      }
      if (!approved) {
        setStatus("Approving marketplace...");
        await writeContractAsync({
          address: nft.contractAddress as Address,
          abi: erc721ApprovalAbi,
          functionName: "setApprovalForAll",
          args: [marketplaceAddress, true]
        });
        await refetch();
      }
      setStatus("Listing NFT...");
      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "listItem",
        args: [nft.contractAddress as Address, BigInt(nft.tokenId), parseEther(priceEth)]
      });
      setStatus("Verifying listing...");
      await api("/api/marketplace/verify-listing", {
        method: "POST",
        body: JSON.stringify({ chainId: nft.chainId, txHash })
      });
      setStatus("Listed successfully.");
      onListed?.();
    } catch (err) {
      setStatus(undefined);
      setError(err instanceof Error ? err.message : "Failed to list NFT");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#080b12] p-5 shadow-2xl shadow-cyan/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan">List for sale</p>
            <h2 className="mt-2 text-2xl font-black">{nft.name}</h2>
          </div>
          <button className="rounded-full border border-white/10 px-3 py-1 text-sm text-muted hover:text-white" onClick={onClose}>Close</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="aspect-square overflow-hidden rounded-lg bg-white/5">
            {image ? <img src={image} alt={nft.name} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-muted">Price in ETH</span>
              <input
                value={priceEth}
                onChange={(event) => setPriceEth(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/40 px-3 text-white outline-none focus:border-cyan"
                placeholder="0.01"
              />
            </label>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-muted">
              Marketplace: {marketplaceAddress ?? "not configured"}
            </div>
          </div>
        </div>
        {status && <p className="mt-4 rounded-md border border-lime/30 bg-lime/10 p-3 text-sm text-lime">{status}</p>}
        {!marketplaceAllowed && <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">Internal marketplace listing requires Creator or Pro. Free and Starter can still use external marketplace links.</p>}
        {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
        <Button disabled={!canList || isPending} onClick={list} className="mt-5 w-full">
          {isPending ? "Waiting for wallet..." : approved ? "List NFT" : "Approve & List NFT"}
        </Button>
      </div>
    </div>
  );
}
