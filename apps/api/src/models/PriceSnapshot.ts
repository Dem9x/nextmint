import { Schema, model } from "mongoose";

const priceSnapshotSchema = new Schema(
  {
    tokenSymbol: { type: String, required: true, uppercase: true, index: true },
    tokenAddress: { type: String, lowercase: true },
    chainId: { type: Number, required: true, index: true },
    priceUsd: { type: Number, required: true },
    priceIdr: Number,
    marketCapUsd: Number,
    volume24hUsd: Number,
    change24hPercent: Number,
    provider: { type: String, required: true, index: true },
    source: String,
    isFallback: { type: Boolean, default: false },
    isManualOverride: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

priceSnapshotSchema.index({ tokenSymbol: 1, chainId: 1, createdAt: -1 });
priceSnapshotSchema.index({ provider: 1, createdAt: -1 });
priceSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PriceSnapshot = model("PriceSnapshot", priceSnapshotSchema);
