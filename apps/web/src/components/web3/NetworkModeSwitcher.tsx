"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_TESTNET_CHAINS } from "@/config/chains";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { ChainBadge } from "./ChainBadge";

export function NetworkModeSwitcher() {
  const {
    selectedChain,
    selectedChainId,
    walletChainId,
    isWalletConnected,
    isWrongNetwork,
    isSwitching,
    setSelectedChainId,
    switchToSelectedChain
  } = useNetworkMode();

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:inline-flex sm:rounded-full"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <ChainBadge chainId={selectedChainId} compact className="hidden md:inline-flex" />
        <label className="relative min-w-0 flex-1 sm:flex-none">
          <span className="sr-only">Select app network</span>
          <select
            value={selectedChainId}
            onChange={(event) => setSelectedChainId(Number(event.target.value))}
            className="h-9 w-full appearance-none rounded-full border border-white/10 bg-black/40 px-3 pr-9 text-sm text-white outline-none transition hover:border-cyan/50 focus:border-cyan sm:w-52"
          >
            {SUPPORTED_TESTNET_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id} className="bg-slate-950">
                {chain.name} ({chain.nativeCurrency.symbol})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted" />
        </label>
      </div>

      {isWalletConnected && isWrongNetwork ? (
        <button
          type="button"
          onClick={() => void switchToSelectedChain()}
          disabled={isSwitching || !selectedChain}
          className="h-9 rounded-full border border-cyan/40 bg-cyan/15 px-3 text-xs font-bold text-cyan transition hover:bg-cyan/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSwitching ? "Switching..." : `Switch to ${selectedChain?.name ?? "Network"}`}
        </button>
      ) : (
        <div className="hidden shrink-0 items-center gap-2 text-xs text-muted lg:flex">
          <span>Wallet</span> {walletChainId ? <ChainBadge chainId={walletChainId} compact /> : "not connected"}
        </div>
      )}
    </motion.div>
  );
}
