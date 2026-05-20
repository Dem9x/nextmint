import { PlatformSettings } from "../../models/PlatformSettings.js";
import type { SupportedPriceSymbol, TokenPriceResult } from "../types/pricing.types.js";
import type { BasePriceProvider } from "./base-price.provider.js";

export class ManualPriceProvider implements BasePriceProvider {
  name = "manual" as const;

  isConfigured() {
    return true;
  }

  async getTokenPrice(symbol: SupportedPriceSymbol, chainId: number): Promise<TokenPriceResult> {
    const settings = await PlatformSettings.findOne({ singletonKey: "default" }).lean();
    const key = `${chainId}:${symbol}`;
    const manual = settings?.manualPrices?.[key] ?? settings?.manualPrices?.[symbol];
    if (!manual?.priceUsd) throw new Error(`Manual price missing for ${symbol}`);
    return {
      tokenSymbol: symbol,
      chainId,
      priceUsd: Number(manual.priceUsd),
      provider: this.name,
      source: "platform-settings",
      isFallback: true,
      isManualOverride: true,
      timestamp: new Date()
    };
  }
}
