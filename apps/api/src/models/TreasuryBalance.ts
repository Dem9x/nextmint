import { Schema, model } from "mongoose";

const treasuryBalanceSchema = new Schema(
  {
    chainId: { type: Number, required: true, index: true },
    treasuryAddress: { type: String, required: true, lowercase: true, index: true },
    token: { type: String, required: true, index: true },
    tokenAddress: { type: String, lowercase: true },
    balanceToken: { type: String, required: true },
    priceUsd: { type: Number, default: null },
    balanceUsd: { type: Number, default: null },
    provider: { type: String, default: "rpc" },
    lastSyncedAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

treasuryBalanceSchema.index({ chainId: 1, treasuryAddress: 1, token: 1 }, { unique: true });

export const TreasuryBalance = model("TreasuryBalance", treasuryBalanceSchema);
