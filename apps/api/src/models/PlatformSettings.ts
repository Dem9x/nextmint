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
      default: { free: 5, starter: 50, creator: 300, pro: 1000, enterprise: 10000 }
    },
    creditPackages: {
      type: [Schema.Types.Mixed],
      default: [
        { id: "credits-100", name: "100 Credits", usdPrice: 5, credits: 100, features: ["extra generation credits"] },
        { id: "credits-500", name: "500 Credits", usdPrice: 20, credits: 500, features: ["extra generation credits"] },
        { id: "credits-2500", name: "2500 Credits", usdPrice: 75, credits: 2500, features: ["extra generation credits"] }
      ]
    },
    subscriptionPlans: {
      type: [Schema.Types.Mixed],
      default: [
        { id: "free", tier: "free", name: "Free / Testnet", billingPeriod: "free", durationDays: null, priceUsd: 0, monthlyUsdPrice: 0, yearlyUsdPrice: 0, credits: 5, monthlyCredits: 5, maxImageSize: 512, maxCollectionSupply: 5, allowedCollectionSize: 5, testnetOnly: true, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, includedLaunchpadPublishes: 0, aiProviderAccess: ["free"], features: ["5 credits/month", "512px testnet generation", "collection test up to 5 NFTs"] },
        { id: "starter-monthly", tier: "starter", name: "Starter", billingPeriod: "monthly", durationDays: 30, priceUsd: 9, monthlyUsdPrice: 9, credits: 120, monthlyCredits: 120, maxImageSize: 768, maxCollectionSupply: 50, allowedCollectionSize: 50, testnetOnly: false, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, includedLaunchpadPublishes: 0, aiProviderAccess: ["standard"], features: ["120 credits/month", "max 768px", "collections up to 50 NFTs"] },
        { id: "creator-monthly", tier: "creator", name: "Creator", billingPeriod: "monthly", durationDays: 30, priceUsd: 29, monthlyUsdPrice: 29, credits: 600, monthlyCredits: 600, maxImageSize: 768, maxCollectionSupply: 300, allowedCollectionSize: 300, testnetOnly: false, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: false, includedLaunchpadPublishes: 1, aiProviderAccess: ["standard"], features: ["600 credits/month", "1 launchpad publish/month", "marketplace listing enabled"] },
        { id: "pro-monthly", tier: "pro", name: "Pro", billingPeriod: "monthly", durationDays: 30, priceUsd: 99, monthlyUsdPrice: 99, credits: 2500, monthlyCredits: 2500, maxImageSize: 1024, maxCollectionSupply: 1000, allowedCollectionSize: 1000, testnetOnly: false, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: true, includedLaunchpadPublishes: 5, aiProviderAccess: ["standard", "priority"], features: ["2500 credits/month", "1024px", "5 launchpad publishes/month"] },
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
