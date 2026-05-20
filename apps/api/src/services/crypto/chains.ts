import { zeroAddress } from "viem";
import { CHAIN_REGISTRY, assertSupportedChain as assertConfiguredTestnetChain } from "../../config/chains.config.js";

export type SupportedToken = "NATIVE" | "ETH" | "USDC" | "USDT" | "DAI";

export const supportedChains = CHAIN_REGISTRY;

export const tokenAddresses: Record<number, Partial<Record<SupportedToken, `0x${string}`>>> = {
  84532: { NATIVE: zeroAddress, ETH: zeroAddress },
  11155111: { NATIVE: zeroAddress, ETH: zeroAddress },
  421614: { NATIVE: zeroAddress, ETH: zeroAddress },
  97: { NATIVE: zeroAddress, ETH: zeroAddress }
};

export function assertSupportedChain(chainId: number) {
  const config = assertConfiguredTestnetChain(chainId);
  if (!config.paymentContract) throw new Error(`Missing payment contract for ${config.name}`);
  return config;
}
