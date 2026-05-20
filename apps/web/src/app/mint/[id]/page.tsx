"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { getExplorerAddressUrl } from "@/config/chains";
import { getContractAddress } from "@/lib/web3/contract-addresses";

export default function MintPage() {
  const [quantity, setQuantity] = useState(1);
  const { isConnected, chainId } = useAccount();
  const { selectedChain, selectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const collectionChainId = selectedChainId;
  const contractAddress = getContractAddress(collectionChainId, "nftFactory");
  const canMint = isConnected && chainId === collectionChainId && Boolean(contractAddress);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="aspect-square rounded-lg bg-[linear-gradient(135deg,#0891b2,#111827_50%,#65a30d)]" />
        <div className="rounded-lg border border-white/10 bg-panel p-6">
          <p className="text-sm text-cyan">Public mint</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black">NEXMINT Genesis</h1>
            <ChainBadge chainId={collectionChainId} />
          </div>
          <p className="mt-4 text-muted">Testnet public mint with network validation, supply tracker, wallet status, and transaction states ready for contract data binding.</p>
          <div className="mt-4 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-xs text-yellow-100">
            You are minting on {selectedChain?.name}. Testnet NFTs and funds have no mainnet value.
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {["Supply 421/1000", `Price 0.03 ${selectedChain?.nativeCurrency.symbol ?? "ETH"}`, "Live"].map((x) => <div key={x} className="rounded-md bg-white/5 p-3 text-sm">{x}</div>)}
          </div>
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
            <p className="text-muted">Contract</p>
            {contractAddress ? (
              <a className="mt-1 block break-all text-cyan hover:text-white" href={getExplorerAddressUrl(collectionChainId, contractAddress)} target="_blank" rel="noreferrer">
                {contractAddress}
              </a>
            ) : (
              <p className="mt-1 text-yellow-200">Missing contract address for this testnet. Minting is disabled.</p>
            )}
          </div>
          {isConnected && isWrongNetwork && (
            <div className="mt-4 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-sm text-yellow-100">
              Selected collection network is {selectedChain?.name}. Switch wallet networks before minting.
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <input className="h-11 w-24 rounded-md bg-black/40 px-3" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <Button disabled={!isConnected || (!isWrongNetwork && !canMint)} onClick={() => isWrongNetwork ? void switchToSelectedChain() : undefined}>
              {isWrongNetwork ? `Switch to ${selectedChain?.name}` : `Mint ${quantity}`}
            </Button>
            <ConnectButton />
          </div>
        </div>
      </section>
      </AuthGuard>
    </main>
  );
}
