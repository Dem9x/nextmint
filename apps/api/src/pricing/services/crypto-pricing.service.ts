import { formatUnits, parseUnits } from "viem";
import { PriceProviderHealth } from "../../models/PriceProviderHealth.js";
import { assertSupportedChain } from "../../config/chains.config.js";
import { getCreditPackage, getSubscriptionPlan } from "../../services/platform-settings.service.js";
import { AppError } from "../../middleware/error.js";
import { CoinGeckoProvider } from "../providers/coingecko.provider.js";
import { CoinMarketCapProvider } from "../providers/coinmarketcap.provider.js";
import { DefiLlamaProvider } from "../providers/defillama.provider.js";
import { ManualPriceProvider } from "../providers/manual-price.provider.js";
import { tokenMetadata, type BasePriceProvider } from "../providers/base-price.provider.js";
import { getCachedTokenPrice, saveCachedTokenPrice } from "./price-cache.service.js";
import { savePriceSnapshot } from "./price-snapshot.service.js";
import type { PaymentQuote, SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";

const providers: BasePriceProvider[] = [
  new CoinGeckoProvider(),
  new CoinMarketCapProvider(),
  new DefiLlamaProvider(),
  new ManualPriceProvider()
];

export const PAYMENT_QUOTE_TTL_MS = 5 * 60_000;

function normalizeToken(token: string, chainId: number): SupportedPriceSymbol {
  if (token === "NATIVE") return chainId === 97 ? "BNB" : "ETH";
  const upper = token.toUpperCase();
  if (!["ETH", "USDC", "USDT", "DAI", "BNB", "MATIC", "ARB"].includes(upper)) throw new AppError(400, "Unsupported pricing token");
  return upper as SupportedPriceSymbol;
}

async function markHealth(provider: BasePriceProvider, ok: boolean, latencyMs: number, error?: unknown) {
  await PriceProviderHealth.findOneAndUpdate(
    { provider: provider.name },
    {
      provider: provider.name,
      status: ok ? "healthy" : "degraded",
      ...(ok ? { lastSuccessAt: new Date() } : { lastFailureAt: new Date(), lastError: error instanceof Error ? error.message : String(error) }),
      latencyMs
    },
    { upsert: true }
  );
}

export async function getTokenPrice(symbolInput: string, chainId: number, options: { allowCache?: boolean } = {}) {
  assertSupportedChain(chainId);
  const symbol = normalizeToken(symbolInput, chainId);
  if (options.allowCache !== false) {
    const cached = await getCachedTokenPrice(symbol, chainId);
    if (cached) {
      return {
        tokenSymbol: cached.tokenSymbol,
        chainId: cached.chainId,
        tokenAddress: cached.tokenAddress,
        priceUsd: cached.priceUsd,
        priceIdr: cached.priceIdr,
        marketCapUsd: cached.marketCapUsd,
        volume24hUsd: cached.volume24hUsd,
        change24hPercent: cached.change24hPercent,
        provider: cached.provider,
        source: "cache",
        isFallback: false,
        isManualOverride: false,
        timestamp: cached.updatedAt
      } as TokenPriceResult;
    }
  }

  let lastError: unknown;
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const started = Date.now();
    try {
      const price = await provider.getTokenPrice(symbol, chainId);
      await markHealth(provider, true, Date.now() - started);
      await saveCachedTokenPrice(price);
      await savePriceSnapshot(price);
      return price;
    } catch (error) {
      lastError = error;
      await markHealth(provider, false, Date.now() - started, error);
    }
  }
  throw new AppError(503, lastError instanceof Error ? lastError.message : "No pricing provider available");
}

export async function createQuote(input: { chainId: number; token: string; usdAmount: number }): Promise<PaymentQuote> {
  const price = await getTokenPrice(input.token, input.chainId, { allowCache: true });
  const symbol = normalizeToken(input.token, input.chainId);
  const decimals = tokenMetadata[symbol].decimals;
  const tokenAmountNumber = input.usdAmount / price.priceUsd;
  const amountAtomic = parseUnits(tokenAmountNumber.toFixed(decimals), decimals);
  return {
    chainId: input.chainId,
    token: input.token,
    usdAmount: input.usdAmount,
    tokenAmount: formatUnits(amountAtomic, decimals),
    amountAtomic: amountAtomic.toString(),
    priceUsd: price.priceUsd,
    provider: price.provider,
    expiresAt: new Date(Date.now() + PAYMENT_QUOTE_TTL_MS),
    isFallback: price.isFallback,
    priceTimestamp: price.timestamp
  };
}

export async function quotePayment(input: { chainId: number; token: string; packageId?: string; plan?: string; interval?: "monthly" | "yearly" }) {
  const chain = assertSupportedChain(input.chainId);
  const pkg = input.packageId ? await getCreditPackage(input.packageId) : undefined;
  const plan = input.plan ? await getSubscriptionPlan(input.plan) : undefined;
  const usdAmount = pkg?.usdPrice ?? (plan ? plan.priceUsd ?? plan[input.interval === "yearly" ? "yearlyUsdPrice" : "monthlyUsdPrice"] : undefined);
  if (typeof usdAmount !== "number" || usdAmount <= 0) throw new AppError(400, "Invalid package or plan price");
  const quote = await createQuote({ chainId: input.chainId, token: input.token, usdAmount });
  return {
    ...quote,
    packageId: input.packageId,
    plan: input.plan,
    treasuryAddress: chain.treasuryAddress ?? chain.paymentContract,
    contractAddress: chain.paymentContract
  };
}

export async function quoteUsdPayment(input: { chainId: number; token: string; usdAmount: number; purpose?: string }) {
  const chain = assertSupportedChain(input.chainId);
  const quote = await createQuote({ chainId: input.chainId, token: input.token, usdAmount: input.usdAmount });
  return {
    ...quote,
    purpose: input.purpose,
    treasuryAddress: chain.treasuryAddress ?? chain.paymentContract,
    contractAddress: chain.paymentContract
  };
}
