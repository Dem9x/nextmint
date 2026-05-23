import { PlatformSettings } from "../models/PlatformSettings.js";

export const defaultSubscriptionPlans = [
  { id: "free", tier: "free", name: "Free / Testnet", billingPeriod: "free", durationDays: null, priceUsd: 0, monthlyUsdPrice: 0, yearlyUsdPrice: 0, credits: 5, monthlyCredits: 5, maxImageSize: 512, maxCollectionSupply: 5, allowedCollectionSize: 5, testnetOnly: true, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, includedLaunchpadPublishes: 0, features: ["5 credits/month", "512px testnet generation", "collection test up to 5 NFTs"] },
  { id: "starter-monthly", tier: "starter", name: "Starter", billingPeriod: "monthly", durationDays: 30, priceUsd: 9, monthlyUsdPrice: 9, yearlyUsdPrice: null, credits: 120, monthlyCredits: 120, maxImageSize: 768, maxCollectionSupply: 50, allowedCollectionSize: 50, testnetOnly: false, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, includedLaunchpadPublishes: 0, features: ["120 credits/month", "max 768px", "collections up to 50 NFTs", "external marketplace links"] },
  { id: "creator-monthly", tier: "creator", name: "Creator", billingPeriod: "monthly", durationDays: 30, priceUsd: 29, monthlyUsdPrice: 29, yearlyUsdPrice: null, credits: 600, monthlyCredits: 600, maxImageSize: 768, maxCollectionSupply: 300, allowedCollectionSize: 300, testnetOnly: false, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: false, includedLaunchpadPublishes: 1, features: ["600 credits/month", "collections up to 300 NFTs", "1 launchpad publish/month", "marketplace listing enabled"] },
  { id: "pro-monthly", tier: "pro", name: "Pro", billingPeriod: "monthly", durationDays: 30, priceUsd: 99, monthlyUsdPrice: 99, yearlyUsdPrice: null, credits: 2500, monthlyCredits: 2500, maxImageSize: 1024, maxCollectionSupply: 1000, allowedCollectionSize: 1000, testnetOnly: false, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: true, includedLaunchpadPublishes: 5, features: ["2500 credits/month", "1024px generation", "collections up to 1000 NFTs", "5 launchpad publishes/month", "priority queue"] },
  { id: "enterprise", tier: "enterprise", name: "Enterprise", billingPeriod: "custom", durationDays: null, priceUsd: null, monthlyUsdPrice: null, yearlyUsdPrice: null, credits: null, monthlyCredits: null, maxImageSize: 2048, maxCollectionSupply: 10000, allowedCollectionSize: 10000, testnetOnly: false, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: true, includedLaunchpadPublishes: null, features: ["custom credits", "API access", "priority queue", "white-label support"] }
];

export const defaultCreditPackages = [
  { id: "credits-100", name: "100 Credits", usdPrice: 5, credits: 100, features: ["extra generation credits"] },
  { id: "credits-500", name: "500 Credits", usdPrice: 20, credits: 500, features: ["extra generation credits"] },
  { id: "credits-2500", name: "2500 Credits", usdPrice: 75, credits: 2500, features: ["extra generation credits"] }
];

function hasDurationPlans(plans: any[]) {
  return plans.some((plan) => plan.id === "creator-monthly" && plan.credits === 600);
}

export async function getPlatformSettings() {
  const settings = await PlatformSettings.findOneAndUpdate(
    { singletonKey: "default" },
    { $setOnInsert: { singletonKey: "default" } },
    { upsert: true, new: true }
  );
  if (!hasDurationPlans((settings.subscriptionPlans as any[]) ?? [])) {
    settings.subscriptionPlans = defaultSubscriptionPlans;
    await settings.save();
  }
  if (!((settings.creditPackages as any[]) ?? []).some((pkg) => pkg.id === "credits-100" && pkg.usdPrice === 5)) {
    settings.creditPackages = defaultCreditPackages;
    await settings.save();
  }
  return settings;
}

export async function getPublicPlans() {
  const settings = await getPlatformSettings();
  return settings.subscriptionPlans;
}

export async function getCreditPackage(packageId: string) {
  const settings = await getPlatformSettings();
  return (settings.creditPackages as any[]).find((pkg) => pkg.id === packageId);
}

export async function getSubscriptionPlan(planId: string) {
  const settings = await getPlatformSettings();
  return (settings.subscriptionPlans as any[]).find((plan) => plan.id === planId || (plan.tier === planId && plan.billingPeriod === "monthly"));
}
