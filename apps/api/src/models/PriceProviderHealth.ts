import { Schema, model } from "mongoose";

const priceProviderHealthSchema = new Schema(
  {
    provider: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["healthy", "degraded", "down"], required: true, index: true },
    lastSuccessAt: Date,
    lastFailureAt: Date,
    lastError: String,
    latencyMs: Number
  },
  { timestamps: true }
);

export const PriceProviderHealth = model("PriceProviderHealth", priceProviderHealthSchema);
