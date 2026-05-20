import { Schema, model, Types } from "mongoose";

const creditTransactionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, enum: ["signup", "purchase", "generation", "refund", "admin_adjustment", "subscription"], index: true },
    reference: { type: Types.ObjectId, refPath: "referenceModel" },
    referenceModel: String,
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

creditTransactionSchema.index({ user: 1, createdAt: -1 });

export const CreditTransaction = model("CreditTransaction", creditTransactionSchema);
