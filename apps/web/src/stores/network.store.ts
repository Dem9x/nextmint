import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CHAIN_ID, getChainById } from "@/config/chains";

type NetworkState = {
  selectedChainId: number;
  selectedChainName: string;
  testnetModeEnabled: boolean;
  lastValidChainId: number;
  setSelectedChainId: (chainId: number) => void;
  resetToDefaultChain: () => void;
  setTestnetModeEnabled: (enabled: boolean) => void;
};

function chainName(chainId: number) {
  return getChainById(chainId)?.name ?? "Unsupported Network";
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      selectedChainId: DEFAULT_CHAIN_ID,
      selectedChainName: chainName(DEFAULT_CHAIN_ID),
      testnetModeEnabled: true,
      lastValidChainId: DEFAULT_CHAIN_ID,
      setSelectedChainId: (chainId) =>
        set({
          selectedChainId: chainId,
          selectedChainName: chainName(chainId),
          lastValidChainId: chainId
        }),
      resetToDefaultChain: () =>
        set({
          selectedChainId: DEFAULT_CHAIN_ID,
          selectedChainName: chainName(DEFAULT_CHAIN_ID),
          lastValidChainId: DEFAULT_CHAIN_ID
        }),
      setTestnetModeEnabled: (enabled) => set({ testnetModeEnabled: enabled })
    }),
    {
      name: "nexmint-network-mode",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedChainId: state.selectedChainId,
        testnetModeEnabled: state.testnetModeEnabled,
        lastValidChainId: state.lastValidChainId
      })
    }
  )
);
