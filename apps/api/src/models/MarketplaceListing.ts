import { Schema, model, Types } from "mongoose";

const marketplaceListingSchema = new Schema(
  {
    chainId: { type: Number, required: true, index: true },
    nftContract: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: String, required: true, index: true },
    seller: { type: String, required: true, lowercase: true, index: true },
    price: { type: String, required: true },
    currency: { type: String, default: "ETH" },
    status: { type: String, enum: ["active", "sold", "cancelled"], default: "active", index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    generationId: { type: Types.ObjectId, ref: "Generation", index: true },
    nftItemId: { type: Types.ObjectId, ref: "NFTItem", index: true },
    listTxHash: { type: String, lowercase: true, index: true },
    cancelTxHash: { type: String, lowercase: true },
    saleTxHash: { type: String, lowercase: true },
    listedAt: { type: Date, default: Date.now },
    soldAt: Date,
    cancelledAt: Date,
    blockNumber: Number
  },
  { timestamps: true }
);

marketplaceListingSchema.index(
  { chainId: 1, nftContract: 1, tokenId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
marketplaceListingSchema.index({ seller: 1, status: 1 });
marketplaceListingSchema.index({ collectionId: 1, status: 1 });
marketplaceListingSchema.index({ chainId: 1, status: 1 });
marketplaceListingSchema.index({ createdAt: -1 });

export const MarketplaceListing = model("MarketplaceListing", marketplaceListingSchema);
