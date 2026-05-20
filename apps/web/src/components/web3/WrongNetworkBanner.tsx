"use client";

import { AlertTriangle } from "lucide-react";
import { useNetworkMode } from "@/hooks/useNetworkMode";

export function WrongNetworkBanner() {
  const { isWalletConnected, isWrongNetwork, selectedChain, isSwitching, switchToSelectedChain } = useNetworkMode();
  if (!isWalletConnected || !isWrongNetwork) return null;

  return (
    <div className="border-b border-yellow-300/20 bg-yellow-400/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm text-yellow-50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-200" />
          <span>Wrong network. Please switch to {selectedChain?.name ?? "the selected testnet"}.</span>
        </div>
        <button
          type="button"
          onClick={() => void switchToSelectedChain()}
          disabled={isSwitching || !selectedChain}
          className="h-9 rounded-md border border-yellow-200/40 px-3 text-xs font-bold uppercase tracking-wide transition hover:bg-yellow-200/10 disabled:opacity-60"
        >
          {isSwitching ? "Switching..." : `Switch to ${selectedChain?.name ?? "network"}`}
        </button>
      </div>
    </div>
  );
}
