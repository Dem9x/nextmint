"use client";

import { WalletCards } from "lucide-react";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { ChainBadge } from "./ChainBadge";

export function NetworkStatusCard() {
  const { selectedChain, selectedChainId, walletChainId, isWalletConnected, isWrongNetwork } = useNetworkMode();

  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Testnet mode</p>
          <h2 className="mt-2 text-xl font-black">Network Status</h2>
        </div>
        <WalletCards className="h-5 w-5 text-cyan" />
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-muted">Selected app chain</p>
          <div className="mt-2"><ChainBadge chainId={selectedChainId} /></div>
          <p className="mt-2 text-xs text-muted">Gas token: {selectedChain?.nativeCurrency.symbol ?? "ETH"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-muted">Wallet chain</p>
          <div className="mt-2">{walletChainId ? <ChainBadge chainId={walletChainId} /> : <span className="text-muted">Not connected</span>}</div>
          <p className={`mt-2 text-xs ${isWrongNetwork ? "text-yellow-200" : "text-emerald-200"}`}>
            {!isWalletConnected ? "Connect a wallet to transact." : isWrongNetwork ? "Switch required before minting or paying." : "Ready for testnet transactions."}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-xs text-yellow-100">
        You are using testnet mode. Assets and funds have no mainnet value.
      </p>
    </div>
  );
}
