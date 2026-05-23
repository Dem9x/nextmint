import { Schema, model, Types } from "mongoose";

const marketplaceActivitySchema = new Schema(
  {
    type: { type: String, enum: ["listed", "sold", "cancelled"], required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    nftContract: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: String, required: true, index: true },
    wallet: { type: String, required: true, lowercase: true, index: true },
    counterparty: { type: String, lowercase: true },
    price: String,
    currency: { type: String, default: "ETH" },
    txHash: { type: String, required: true, lowercase: true, index: true },
    blockNumber: Number,
    timestamp: { type: Date, default: Date.now, index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    generationId: { type: Types.ObjectId, ref: "Generation", index: true },
    nftItemId: { type: Types.ObjectId, ref: "NFTItem", index: true }
  },
  { timestamps: true }
);

marketplaceActivitySchema.index({ chainId: 1, nftContract: 1, tokenId: 1, timestamp: -1 });
marketplaceActivitySchema.index({ wallet: 1, timestamp: -1 });

export const MarketplaceActivity = model("MarketplaceActivity", marketplaceActivitySchema);
