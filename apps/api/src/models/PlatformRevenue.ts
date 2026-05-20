import { Schema, model, Types } from "mongoose";

const platformRevenueSchema = new Schema(
  {
    sourceType: { type: String, enum: ["credit_purchase", "subscription", "mint_fee", "launch_fee", "deploy_fee", "overage_fee", "referral_fee_adjustment"], required: true, index: true },
    userId: { type: Types.ObjectId, ref: "User", index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    chainId: { type: Number, index: true },
    txHash: { type: String, lowercase: true, index: true },
    token: { type: String, index: true },
    grossAmountToken: String,
    grossAmountUsd: { type: Number, default: 0 },
    platformFeeToken: String,
    platformFeeUsd: { type: Number, default: 0 },
    creatorAmountToken: String,
    creatorAmountUsd: { type: Number, default: 0 },
    referrerAmountToken: String,
    referrerAmountUsd: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "confirmed", index: true }
  },
  { timestamps: true }
);

platformRevenueSchema.index({ sourceType: 1, createdAt: -1 });
platformRevenueSchema.index({ chainId: 1, createdAt: -1 });

export const PlatformRevenue = model("PlatformRevenue", platformRevenueSchema);
