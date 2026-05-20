import { Schema, model } from "mongoose";

const chainConfigSchema = new Schema(
  {
    chainId: { type: Number, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nativeCurrency: { type: String, required: true },
    explorerUrl: { type: String, required: true },
    rpcUrlConfigured: { type: Boolean, default: false },
    confirmations: { type: Number, default: 2 },
    isTestnet: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

chainConfigSchema.index({ isActive: 1, isTestnet: 1 });

export const ChainConfig = model("ChainConfig", chainConfigSchema);
