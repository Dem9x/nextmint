import { PlatformSettings } from "../models/PlatformSettings.js";

export const defaultSubscriptionPlans = [
  { id: "free", tier: "free", name: "Free", billingPeriod: "free", durationDays: null, priceUsd: 0, monthlyUsdPrice: 0, yearlyUsdPrice: 0, credits: 10, maxCollectionSupply: 10, allowedCollectionSize: 10, canPublishLaunchpad: false, canDeployContract: false, launchEnabled: false, deploymentEnabled: false, priorityQueue: false, features: ["10 bonus credits", "preview only"] },
  { id: "starter-monthly", tier: "starter", name: "Starter", billingPeriod: "monthly", durationDays: 30, priceUsd: 10, monthlyUsdPrice: 10, credits: 100, maxCollectionSupply: 100, allowedCollectionSize: 100, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: false, features: ["100 credits", "max 100 NFT collection", "launchpad publish enabled"] },
  { id: "starter-yearly", tier: "starter", name: "Starter", billingPeriod: "yearly", durationDays: 365, priceUsd: 96, yearlyUsdPrice: 96, credits: 1200, maxCollectionSupply: 100, allowedCollectionSize: 100, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: false, features: ["1200 credits", "max 100 NFT collection", "save 20%"] },
  { id: "pro-monthly", tier: "pro", name: "Pro", billingPeriod: "monthly", durationDays: 30, priceUsd: 29, monthlyUsdPrice: 29, credits: 500, maxCollectionSupply: 1000, allowedCollectionSize: 1000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, features: ["500 credits", "max 1000 NFT collection", "priority generation queue"] },
  { id: "pro-yearly", tier: "pro", name: "Pro", billingPeriod: "yearly", durationDays: 365, priceUsd: 278, yearlyUsdPrice: 278, credits: 6000, maxCollectionSupply: 1000, allowedCollectionSize: 1000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, features: ["6000 credits", "max 1000 NFT collection", "save 20%"] },
  { id: "enterprise", tier: "enterprise", name: "Enterprise", billingPeriod: "custom", durationDays: null, priceUsd: null, monthlyUsdPrice: null, yearlyUsdPrice: null, credits: null, maxCollectionSupply: 10000, allowedCollectionSize: 10000, canPublishLaunchpad: true, canDeployContract: true, launchEnabled: true, deploymentEnabled: true, priorityQueue: true, features: ["custom credits", "API access", "priority queue", "white-label support"] }
];

function hasDurationPlans(plans: any[]) {
  return plans.some((plan) => plan.id === "pro-monthly" && plan.durationDays === 30);
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
