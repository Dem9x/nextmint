import { env } from "../../config/env.js";
import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";
import { tokenMetadata, type BasePriceProvider } from "./base-price.provider.js";

export class DefiLlamaProvider implements BasePriceProvider {
  name = "defillama" as const;

  isConfigured() {
    return true;
  }

  async getTokenPrice(symbol: SupportedPriceSymbol, chainId: number): Promise<TokenPriceResult> {
    const id = tokenMetadata[symbol].defillamaId;
    const response = await fetch(`${env.DEFILLAMA_BASE_URL}/prices/current/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(`DefiLlama price failed: ${response.status}`);
    const body = await response.json() as any;
    const price = body.coins?.[id]?.price;
    if (!price) throw new Error(`DefiLlama missing price for ${symbol}`);
    return {
      tokenSymbol: symbol,
      chainId,
      priceUsd: Number(price),
      provider: this.name,
      source: env.DEFILLAMA_BASE_URL,
      isFallback: true,
      isManualOverride: false,
      timestamp: new Date()
    };
  }
}
