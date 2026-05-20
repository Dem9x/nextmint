import { Schema, model, Types } from "mongoose";

const creditLedgerSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["purchase", "bonus", "referral_bonus", "generation_spend", "admin_adjustment", "refund"], required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    sourceId: { type: Types.ObjectId, index: true },
    expiresAt: { type: Date, index: true },
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

creditLedgerSchema.index({ userId: 1, createdAt: -1 });

export const CreditLedger = model("CreditLedger", creditLedgerSchema);
