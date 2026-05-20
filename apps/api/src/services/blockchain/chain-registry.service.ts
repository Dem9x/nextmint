import { CHAIN_REGISTRY, assertSupportedChain, getChainConfig } from "../../config/chains.config.js";

export function listPublicChains() {
  return Object.values(CHAIN_REGISTRY).map(({ chainId, slug, name, nativeCurrency, explorerUrl, isTestnet }) => ({
    chainId,
    slug,
    name,
    nativeCurrency,
    explorerUrl,
    isTestnet
  }));
}

export { assertSupportedChain, getChainConfig };
