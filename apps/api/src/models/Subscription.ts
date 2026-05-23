import { Schema, model, Types } from "mongoose";

const subscriptionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    userId: { type: Types.ObjectId, ref: "User", index: true },
    plan: { type: String, enum: ["free", "starter", "creator", "pro", "enterprise"], default: "free", index: true },
    planId: { type: String, index: true },
    planName: String,
    planTier: { type: String, enum: ["free", "starter", "creator", "pro", "enterprise"], default: "free", index: true },
    status: { type: String, enum: ["active", "past_due", "cancelled", "expired", "pending_payment", "grace_period", "replaced"], default: "active", index: true },
    interval: { type: String, enum: ["free", "monthly", "yearly", "custom"], default: "monthly" },
    billingPeriod: { type: String, enum: ["free", "monthly", "yearly", "custom"], default: "monthly" },
    activatedAt: Date,
    expiresAt: { type: Date, index: true },
    cancelledAt: Date,
    renewedAt: Date,
    previousSubscriptionId: { type: Types.ObjectId, ref: "Subscription" },
    pendingPlanChange: Schema.Types.Mixed,
    paymentTxHash: { type: String, lowercase: true, index: true, sparse: true },
    chainId: Number,
    token: String,
    amountToken: String,
    amountUsd: Number,
    autoRenewEnabled: { type: Boolean, default: false },
    currentPeriodStart: Date,
    currentPeriodEnd: { type: Date, index: true },
    renewsWithCrypto: { type: Boolean, default: true },
    lastPayment: { type: Types.ObjectId, ref: "CryptoTransaction" },
    usage: {
      generationsThisPeriod: { type: Number, default: 0 },
      collectionsThisPeriod: { type: Number, default: 0 }
    },
    limits: {
      generations: { type: Number, default: 10 },
      monthlyCredits: Number,
      maxCollectionSize: { type: Number, default: 100 },
      maxImageSize: Number,
      testnetOnly: Boolean,
      launchEnabled: Boolean,
      marketplaceListingEnabled: Boolean,
      includedLaunchpadPublishes: Number
    }
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, expiresAt: 1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });
subscriptionSchema.index({ paymentTxHash: 1 }, { unique: true, sparse: true });

export const Subscription = model("Subscription", subscriptionSchema);
