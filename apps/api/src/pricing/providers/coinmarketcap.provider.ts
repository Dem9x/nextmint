import { env } from "../../config/env.js";
import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";
import { tokenMetadata, type BasePriceProvider } from "./base-price.provider.js";

export class CoinMarketCapProvider implements BasePriceProvider {
  name = "coinmarketcap" as const;

  isConfigured() {
    return Boolean(env.COINMARKETCAP_API_KEY);
  }

  async getTokenPrice(symbol: SupportedPriceSymbol, chainId: number): Promise<TokenPriceResult> {
    if (!this.isConfigured()) throw new Error("CoinMarketCap API key missing");
    const cmcSymbol = tokenMetadata[symbol].coinmarketcapId;
    const url = new URL("https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest");
    url.searchParams.set("symbol", cmcSymbol);
    const response = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": env.COINMARKETCAP_API_KEY! } });
    if (!response.ok) throw new Error(`CoinMarketCap price failed: ${response.status}`);
    const body = await response.json() as any;
    const quote = Array.isArray(body.data?.[cmcSymbol]) ? body.data[cmcSymbol][0]?.quote?.USD : body.data?.[cmcSymbol]?.quote?.USD;
    if (!quote?.price) throw new Error(`CoinMarketCap missing price for ${symbol}`);
    return {
      tokenSymbol: symbol,
      chainId,
      priceUsd: Number(quote.price),
      marketCapUsd: quote.market_cap ? Number(quote.market_cap) : undefined,
      volume24hUsd: quote.volume_24h ? Number(quote.volume_24h) : undefined,
      change24hPercent: quote.percent_change_24h ? Number(quote.percent_change_24h) : undefined,
      provider: this.name,
      source: url.origin,
      isFallback: true,
      isManualOverride: false,
      timestamp: new Date()
    };
  }
}
