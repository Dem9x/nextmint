"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { SUPPORTED_TESTNET_CHAINS } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "NEXMINT AI",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "replace-me",
  chains: SUPPORTED_TESTNET_CHAINS,
  transports: Object.fromEntries(
    SUPPORTED_TESTNET_CHAINS.map((chain) => [chain.id, http(chain.rpcUrls.default.http[0])])
  ),
  ssr: true
});
