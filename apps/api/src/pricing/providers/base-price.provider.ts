import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";

export interface BasePriceProvider {
  name: TokenPriceResult["provider"];
  isConfigured(): boolean;
  getTokenPrice(symbol: SupportedPriceSymbol, chainId: number): Promise<TokenPriceResult>;
}

export const tokenMetadata: Record<SupportedPriceSymbol, { coingeckoId: string; coinmarketcapId: string; defillamaId: string; decimals: number }> = {
  ETH: { coingeckoId: "ethereum", coinmarketcapId: "ETH", defillamaId: "coingecko:ethereum", decimals: 18 },
  USDC: { coingeckoId: "usd-coin", coinmarketcapId: "USDC", defillamaId: "coingecko:usd-coin", decimals: 6 },
  USDT: { coingeckoId: "tether", coinmarketcapId: "USDT", defillamaId: "coingecko:tether", decimals: 6 },
  DAI: { coingeckoId: "dai", coinmarketcapId: "DAI", defillamaId: "coingecko:dai", decimals: 18 },
  BNB: { coingeckoId: "binancecoin", coinmarketcapId: "BNB", defillamaId: "coingecko:binancecoin", decimals: 18 },
  MATIC: { coingeckoId: "matic-network", coinmarketcapId: "MATIC", defillamaId: "coingecko:matic-network", decimals: 18 },
  ARB: { coingeckoId: "arbitrum", coinmarketcapId: "ARB", defillamaId: "coingecko:arbitrum", decimals: 18 }
};
