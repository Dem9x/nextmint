import { Schema, model, Types } from "mongoose";

const aiUsageLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    generationId: { type: Types.ObjectId, ref: "Generation", index: true },
    provider: { type: String, required: true, index: true },
    model: { type: String, required: true },
    taskType: { type: String, required: true, index: true },
    promptHash: { type: String, required: true, index: true },
    status: { type: String, enum: ["success", "failed"], required: true, index: true },
    latencyMs: { type: Number, required: true },
    usedFallback: { type: Boolean, default: false },
    errorCode: String,
    errorMessage: String,
    estimatedCostUsd: { type: Number, default: null },
    creditsCharged: { type: Number, default: 0 },
    userPlan: { type: String, index: true },
    isFreeTier: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ userId: 1, createdAt: -1 });
aiUsageLogSchema.index({ provider: 1, createdAt: -1 });
aiUsageLogSchema.index({ status: 1, createdAt: -1 });
aiUsageLogSchema.index({ taskType: 1, createdAt: -1 });

export const AIUsageLog = model("AIUsageLog", aiUsageLogSchema);
