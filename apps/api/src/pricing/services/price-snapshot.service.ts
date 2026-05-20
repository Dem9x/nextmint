import { PriceSnapshot } from "../../models/PriceSnapshot.js";
import type { TokenPriceResult } from "../types/pricing.types.js";

export const PRICE_SNAPSHOT_TTL_MS = 24 * 60 * 60_000;

export async function savePriceSnapshot(price: TokenPriceResult, ttlMs = PRICE_SNAPSHOT_TTL_MS) {
  return PriceSnapshot.create({
    tokenSymbol: price.tokenSymbol,
    tokenAddress: price.tokenAddress,
    chainId: price.chainId,
    priceUsd: price.priceUsd,
    priceIdr: price.priceIdr,
    marketCapUsd: price.marketCapUsd,
    volume24hUsd: price.volume24hUsd,
    change24hPercent: price.change24hPercent,
    provider: price.provider,
    source: price.source,
    isFallback: price.isFallback,
    isManualOverride: price.isManualOverride,
    expiresAt: new Date(Date.now() + ttlMs)
  });
}
