export type SupportedPriceSymbol = "ETH" | "USDC" | "USDT" | "DAI" | "BNB" | "MATIC" | "ARB";
export type FiatCurrency = "USD" | "IDR" | "EUR";
export type PriceProviderName = "coingecko" | "coinmarketcap" | "defillama" | "manual";

export type TokenPriceResult = {
  tokenSymbol: string;
  chainId: number;
  tokenAddress?: string;
  priceUsd: number;
  priceIdr?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  change24hPercent?: number;
  provider: PriceProviderName;
  source: string;
  isFallback: boolean;
  isManualOverride: boolean;
  timestamp: Date;
};

export type PaymentQuote = {
  chainId: number;
  token: string;
  usdAmount: number;
  tokenAmount: string;
  amountAtomic: string;
  priceUsd: number;
  provider: PriceProviderName;
  expiresAt: Date;
  isFallback: boolean;
  priceTimestamp: Date;
};
