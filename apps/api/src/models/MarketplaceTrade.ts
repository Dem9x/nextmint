import { Schema, model, Types } from "mongoose";

const marketplaceTradeSchema = new Schema(
  {
    chainId: { type: Number, required: true, index: true },
    nftContract: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: String, required: true, index: true },
    seller: { type: String, required: true, lowercase: true, index: true },
    buyer: { type: String, required: true, lowercase: true, index: true },
    price: { type: String, required: true },
    currency: { type: String, default: "ETH" },
    platformFee: { type: String, default: "0" },
    txHash: { type: String, required: true, lowercase: true, unique: true },
    blockNumber: Number,
    timestamp: { type: Date, default: Date.now, index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    generationId: { type: Types.ObjectId, ref: "Generation", index: true },
    nftItemId: { type: Types.ObjectId, ref: "NFTItem", index: true }
  },
  { timestamps: true }
);

marketplaceTradeSchema.index({ chainId: 1, nftContract: 1, tokenId: 1 });

export const MarketplaceTrade = model("MarketplaceTrade", marketplaceTradeSchema);
