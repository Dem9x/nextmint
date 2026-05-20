import { Schema, model } from "mongoose";

const tokenPriceSchema = new Schema(
  {
    tokenSymbol: { type: String, required: true, uppercase: true, index: true },
    tokenAddress: { type: String, lowercase: true },
    chainId: { type: Number, required: true, index: true },
    coingeckoId: String,
    coinmarketcapId: String,
    defillamaId: String,
    decimals: { type: Number, default: 18 },
    priceUsd: { type: Number, required: true },
    priceIdr: Number,
    volume24hUsd: Number,
    marketCapUsd: Number,
    change24hPercent: Number,
    provider: { type: String, required: true },
    staleAfter: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

tokenPriceSchema.index({ tokenSymbol: 1, chainId: 1 }, { unique: true });
tokenPriceSchema.index({ updatedAt: -1 });

export const TokenPrice = model("TokenPrice", tokenPriceSchema);
