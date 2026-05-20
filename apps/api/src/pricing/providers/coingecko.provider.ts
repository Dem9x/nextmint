import { env } from "../../config/env.js";
import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";
import { tokenMetadata, type BasePriceProvider } from "./base-price.provider.js";

export class CoinGeckoProvider implements BasePriceProvider {
  name = "coingecko" as const;

  isConfigured() {
    return true;
  }

  async getTokenPrice(symbol: SupportedPriceSymbol, chainId: number): Promise<TokenPriceResult> {
    const id = tokenMetadata[symbol].coingeckoId;
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", id);
    url.searchParams.set("vs_currencies", "usd,idr");
    url.searchParams.set("include_market_cap", "true");
    url.searchParams.set("include_24hr_vol", "true");
    url.searchParams.set("include_24hr_change", "true");
    const headers: Record<string, string> = env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`CoinGecko price failed: ${response.status}`);
    const body = await response.json() as Record<string, any>;
    const data = body[id];
    if (!data?.usd) throw new Error(`CoinGecko missing price for ${symbol}`);
    return {
      tokenSymbol: symbol,
      chainId,
      priceUsd: Number(data.usd),
      priceIdr: data.idr ? Number(data.idr) : undefined,
      marketCapUsd: data.usd_market_cap ? Number(data.usd_market_cap) : undefined,
      volume24hUsd: data.usd_24h_vol ? Number(data.usd_24h_vol) : undefined,
      change24hPercent: data.usd_24h_change ? Number(data.usd_24h_change) : undefined,
      provider: this.name,
      source: url.origin,
      isFallback: false,
      isManualOverride: false,
      timestamp: new Date()
    };
  }
}
