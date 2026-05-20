import { TokenPrice } from "../../models/TokenPrice.js";
import { tokenMetadata } from "../providers/base-price.provider.js";
import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";

export const TOKEN_PRICE_TTL_MS = 60_000;

export async function getCachedTokenPrice(symbol: SupportedPriceSymbol, chainId: number) {
  const cached = await TokenPrice.findOne({ tokenSymbol: symbol, chainId }).lean();
  if (!cached || cached.staleAfter.getTime() <= Date.now()) return undefined;
  return cached;
}

export async function saveCachedTokenPrice(price: TokenPriceResult) {
  const metadata = tokenMetadata[price.tokenSymbol as SupportedPriceSymbol];
  const staleAfter = new Date(Date.now() + TOKEN_PRICE_TTL_MS);
  return TokenPrice.findOneAndUpdate(
    { tokenSymbol: price.tokenSymbol, chainId: price.chainId },
    {
      tokenSymbol: price.tokenSymbol,
      tokenAddress: price.tokenAddress,
      chainId: price.chainId,
      coingeckoId: metadata?.coingeckoId,
      coinmarketcapId: metadata?.coinmarketcapId,
      defillamaId: metadata?.defillamaId,
      decimals: metadata?.decimals ?? 18,
      priceUsd: price.priceUsd,
      priceIdr: price.priceIdr,
      volume24hUsd: price.volume24hUsd,
      marketCapUsd: price.marketCapUsd,
      change24hPercent: price.change24hPercent,
      provider: price.provider,
      staleAfter
    },
    { upsert: true, new: true }
  );
}
