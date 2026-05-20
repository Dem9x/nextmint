import { Schema, model, Types } from "mongoose";

const platformSettingsSchema = new Schema(
  {
    singletonKey: { type: String, default: "default", unique: true, index: true },
    platformMintFeePercent: { type: Number, default: 2.5, min: 0, max: 100 },
    platformMintFeeBps: { type: Number, default: 250, min: 0, max: 1000 },
    referralRewardPercent: { type: Number, default: 10, min: 0, max: 100 },
    referralRewardBps: { type: Number, default: 1000, min: 0, max: 10000 },
    subscriptionGracePeriodDays: { type: Number, default: 0, min: 0 },
    publishFeeUsd: { type: Number, default: 5, min: 0 },
    launchFeeUsd: { type: Number, default: 25, min: 0 },
    deployServiceFeeUsd: { type: Number, default: 15, min: 0 },
    creatorPayoutDelayDays: { type: Number, default: 0, min: 0 },
    maxSupplyByPlan: {
      type: Schema.Types.Mixed,
      default: { free: 0, starter: 100, pro: 1000, enterprise: 10000 }
    },
    creditPackages: {
      type: [Schema.Types.Mixed],
      default: [
        { id: "starter", name: "Starter", usdPrice: 10, credits: 100, features: ["100 credits", "basic metadata", "public launch enabled"] },
        { id: "pro", name: "Pro", usdPrice: 29, credits: 500, features: ["500 credits", "rarity engine", "IPFS upload", "deployment tools"] },
        { id: "enterprise", name: "Enterprise", usdPrice: null, credits: null, features: ["custom credits", "API access", "priority queue", "white-label support"] }
      ]
    },
    subscriptionPlans: {
      type: [Schema.Types.Mixed],
      default: [
        { id: "free", tier: "free", name: "Free", billingPeriod: "free", durationDays: null, priceUsd: 0, monthlyUsdPrice: 0, yearlyUsdPrice: 0, credits: 10, maxCollectionSupply: 10, allowedCollectionSize: 10, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, priorityQueue: false, aiProviderAccess: ["free"], features: ["10 bonus credits", "preview only"] },
        { id: "starter-monthly", tier: "starter", name: "Starter", billingPeriod: "monthly", durationDays: 30, priceUsd: 10, monthlyUsdPrice: 10, credits: 100, maxCollectionSupply: 100, allowedCollectionSize: 100, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: false, aiProviderAccess: ["standard"], features: ["100 credits", "max 100 NFT collection", "launchpad publish enabled"] },
        { id: "starter-yearly", tier: "starter", name: "Starter", billingPeriod: "yearly", durationDays: 365, priceUsd: 96, yearlyUsdPrice: 96, credits: 1200, maxCollectionSupply: 100, allowedCollectionSize: 100, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: false, aiProviderAccess: ["standard"], features: ["1200 credits", "max 100 NFT collection", "save 20%"] },
        { id: "pro-monthly", tier: "pro", name: "Pro", billingPeriod: "monthly", durationDays: 30, priceUsd: 29, monthlyUsdPrice: 29, credits: 500, maxCollectionSupply: 1000, allowedCollectionSize: 1000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, aiProviderAccess: ["standard", "priority"], features: ["500 credits", "max 1000 NFT collection", "priority generation queue"] },
        { id: "pro-yearly", tier: "pro", name: "Pro", billingPeriod: "yearly", durationDays: 365, priceUsd: 278, yearlyUsdPrice: 278, credits: 6000, maxCollectionSupply: 1000, allowedCollectionSize: 1000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, aiProviderAccess: ["standard", "priority"], features: ["6000 credits", "max 1000 NFT collection", "save 20%"] },
        { id: "enterprise", tier: "enterprise", name: "Enterprise", billingPeriod: "custom", durationDays: null, priceUsd: null, monthlyUsdPrice: null, yearlyUsdPrice: null, credits: null, maxCollectionSupply: 10000, allowedCollectionSize: 10000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, aiProviderAccess: ["custom"], features: ["custom credits", "API access", "priority queue", "white-label support"] }
      ]
    },
    supportedPayoutTokens: { type: [String], default: ["ETH"] },
    minimumPayoutUsd: { type: Number, default: 25, min: 0 },
    payoutReviewRequired: { type: Boolean, default: true },
    manualPrices: { type: Schema.Types.Mixed, default: {} },
    updatedByAdminId: { type: Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const PlatformSettings = model("PlatformSettings", platformSettingsSchema);
