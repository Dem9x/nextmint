import { Schema, model, Types } from "mongoose";

const collectionLikeSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true },
    wallet: { type: String, required: true, lowercase: true, index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

collectionLikeSchema.index({ collectionId: 1, wallet: 1 }, { unique: true });

export const CollectionLike = model("CollectionLike", collectionLikeSchema);
