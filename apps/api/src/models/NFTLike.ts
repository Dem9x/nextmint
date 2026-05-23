import { Schema, model, Types } from "mongoose";

const nftLikeSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true },
    wallet: { type: String, required: true, lowercase: true, index: true },
    nftItemId: { type: Types.ObjectId, ref: "NFTItem", required: true, index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    chainId: { type: Number, index: true },
    nftContract: { type: String, lowercase: true, index: true },
    tokenId: { type: String, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

nftLikeSchema.index({ nftItemId: 1, wallet: 1 }, { unique: true });

export const NFTLike = model("NFTLike", nftLikeSchema);
