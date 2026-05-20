import { Schema, model, Types } from "mongoose";

const transactionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", index: true },
    type: { type: String, enum: ["credit_purchase", "subscription", "mint_fee", "contract_deploy", "withdrawal"], index: true },
    status: { type: String, enum: ["pending", "confirmed", "failed", "refunded"], default: "pending", index: true },
    chainId: { type: Number, index: true },
    walletAddress: { type: String, lowercase: true, index: true },
    token: String,
    amount: String,
    usdValue: Number,
    txHash: { type: String, index: true, sparse: true },
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ txHash: 1, chainId: 1 }, { unique: true, sparse: true });

export const Transaction = model("Transaction", transactionSchema);
