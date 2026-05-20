"use client";

import { useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  getChainById,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  isSupportedChain as isSupportedChainId
} from "@/config/chains";
import { useNetworkStore } from "@/stores/network.store";

export function useNetworkMode() {
  const { chainId: walletChainId, isConnected } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const selectedChainId = useNetworkStore((state) => state.selectedChainId);
  const setSelectedChainId = useNetworkStore((state) => state.setSelectedChainId);
  const testnetModeEnabled = useNetworkStore((state) => state.testnetModeEnabled);
  const selectedChain = getChainById(selectedChainId);
  const walletSupported = isSupportedChainId(walletChainId);
  const isWrongNetwork = isConnected && (!walletSupported || walletChainId !== selectedChainId);

  const switchToSelectedChain = useCallback(async () => {
    if (!selectedChain) return;
    await switchChainAsync({ chainId: selectedChain.id });
  }, [selectedChain, switchChainAsync]);

  return {
    selectedChain,
    selectedChainId,
    walletChainId,
    isWalletConnected: isConnected,
    isSupportedChain: walletSupported,
    isWrongNetwork,
    isSwitching: isPending,
    testnetModeEnabled,
    switchToSelectedChain,
    setSelectedChainId,
    getExplorerTxUrl,
    getExplorerAddressUrl
  };
}
