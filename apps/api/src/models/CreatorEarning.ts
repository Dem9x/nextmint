import { Schema, model, Types } from "mongoose";

const creatorEarningSchema = new Schema(
  {
    creatorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    chainId: { type: Number, index: true },
    txHash: { type: String, lowercase: true, index: true },
    sourceType: { type: String, required: true, index: true },
    token: { type: String, required: true, index: true },
    grossAmountToken: String,
    platformFeeToken: String,
    netAmountToken: String,
    netAmountUsd: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "available", "paid", "failed"], default: "pending", index: true },
    availableAt: Date,
    paidAt: Date
  },
  { timestamps: true }
);

creatorEarningSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

export const CreatorEarning = model("CreatorEarning", creatorEarningSchema);
