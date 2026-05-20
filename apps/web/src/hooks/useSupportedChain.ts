"use client";

import { useAccount } from "wagmi";
import { SUPPORTED_TESTNET_CHAINS, getChainById, isSupportedChain } from "@/config/chains";
import { useNetworkStore } from "@/stores/network.store";

export function useSupportedChain() {
  const { chainId, isConnected } = useAccount();
  const selectedChainId = useNetworkStore((state) => state.selectedChainId);
  const currentChain = getChainById(chainId);
  const selectedChain = getChainById(selectedChainId);
  const supported = isSupportedChain(chainId);
  const wrongNetworkReason = !isConnected
    ? undefined
    : !supported
      ? "Unsupported testnet"
      : chainId !== selectedChainId
        ? `Wallet is not on ${selectedChain?.name ?? "the selected network"}`
        : undefined;

  return {
    currentChain,
    selectedChain,
    supportedChains: SUPPORTED_TESTNET_CHAINS,
    isSupported: supported,
    isWrongNetwork: Boolean(wrongNetworkReason),
    wrongNetworkReason
  };
}
