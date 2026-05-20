import { Schema, model, Types } from "mongoose";

const referralSchema = new Schema(
  {
    referrerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    referredUserId: { type: Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    referralCode: { type: String, required: true, uppercase: true, index: true },
    status: { type: String, enum: ["pending", "active", "rejected"], default: "active", index: true }
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1, createdAt: -1 });

export const Referral = model("Referral", referralSchema);
