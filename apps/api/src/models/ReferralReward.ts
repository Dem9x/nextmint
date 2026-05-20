import { Schema, model, Types } from "mongoose";

const referralRewardSchema = new Schema(
  {
    referrerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    referredUserId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    sourceTransactionId: { type: Types.ObjectId, ref: "CryptoTransaction", index: true },
    sourceType: { type: String, required: true, index: true },
    rewardType: { type: String, enum: ["credit", "withdrawable"], required: true, index: true },
    token: String,
    amountToken: String,
    amountUsd: { type: Number, default: 0 },
    creditsAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "available", "claimed", "rejected"], default: "pending", index: true }
  },
  { timestamps: true }
);

referralRewardSchema.index({ referrerId: 1, status: 1, createdAt: -1 });

export const ReferralReward = model("ReferralReward", referralRewardSchema);
