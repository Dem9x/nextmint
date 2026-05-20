import { Schema, model, Types } from "mongoose";

const creatorPayoutSchema = new Schema(
  {
    creatorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    payoutWallet: { type: String, required: true, lowercase: true, index: true },
    token: { type: String, required: true, index: true },
    amountToken: String,
    amountUsd: { type: Number, required: true },
    txHash: { type: String, lowercase: true, index: true, sparse: true },
    status: { type: String, enum: ["requested", "approved", "processing", "paid", "rejected", "failed"], default: "requested", index: true },
    requestedAt: { type: Date, default: Date.now },
    paidAt: Date,
    reviewedByAdminId: { type: Types.ObjectId, ref: "User" },
    rejectionReason: String
  },
  { timestamps: true }
);

creatorPayoutSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

export const CreatorPayout = model("CreatorPayout", creatorPayoutSchema);
