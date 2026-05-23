import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { CryptoTransaction } from "../models/CryptoTransaction.js";
import { AppError } from "../middleware/error.js";
import { getPlatformSettings, getSubscriptionPlan } from "./platform-settings.service.js";

export type PlanId = "free" | "starter" | "creator" | "pro" | "enterprise";

type CostSafePlanLimits = {
  monthlyCredits: number | null;
  generations: number;
  maxImageSize: number;
  maxCollectionSize: number;
  launchEnabled: boolean;
  deploymentEnabled: boolean;
  marketplaceListingEnabled: boolean;
  priorityQueue: boolean;
  testnetOnly: boolean;
  includedLaunchpadPublishes: number | null;
};

const defaultPlanLimits: Record<PlanId, CostSafePlanLimits> = {
  free: { monthlyCredits: 5, generations: 5, maxImageSize: 512, maxCollectionSize: 5, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, testnetOnly: true, includedLaunchpadPublishes: 0 },
  starter: { monthlyCredits: 120, generations: 120, maxImageSize: 768, maxCollectionSize: 50, launchEnabled: false, deploymentEnabled: false, marketplaceListingEnabled: false, priorityQueue: false, testnetOnly: false, includedLaunchpadPublishes: 0 },
  creator: { monthlyCredits: 600, generations: 600, maxImageSize: 768, maxCollectionSize: 300, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: false, testnetOnly: false, includedLaunchpadPublishes: 1 },
  pro: { monthlyCredits: 2500, generations: 2500, maxImageSize: 1024, maxCollectionSize: 1000, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: true, testnetOnly: false, includedLaunchpadPublishes: 5 },
  enterprise: { monthlyCredits: null, generations: 10000, maxImageSize: 2048, maxCollectionSize: 10000, launchEnabled: true, deploymentEnabled: true, marketplaceListingEnabled: true, priorityQueue: true, testnetOnly: false, includedLaunchpadPublishes: null }
};

function isActiveSubscription(subscription: any) {
  if (!subscription) return false;
  const expiresAt = subscription.expiresAt ?? subscription.currentPeriodEnd;
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  return ["active", "grace_period"].includes(subscription.status) && !expired;
}

function normalizePlan(plan?: string): PlanId {
  return ["starter", "creator", "pro", "enterprise"].includes(plan ?? "") ? (plan as PlanId) : "free";
}

export async function getActiveUserPlan(userId: string) {
  const [user, subscription, settings] = await Promise.all([
    User.findById(userId).select("plan currentPlan subscriptionId credits paidCredits bonusCredits").lean(),
    Subscription.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    getPlatformSettings()
  ]);
  const subscriptionActive = isActiveSubscription(subscription);
  const activeSubscription = subscriptionActive ? subscription : null;
  const plan = normalizePlan(activeSubscription ? (activeSubscription.planTier ?? activeSubscription.plan) : user?.currentPlan ?? user?.plan);
  const planConfig = activeSubscription
    ? ((settings.subscriptionPlans as any[]) ?? []).find((item) => item.id === activeSubscription.planId || item.tier === plan)
    : ((settings.subscriptionPlans as any[]) ?? []).find((item) => item.id === plan || (item.tier === plan && item.billingPeriod === "monthly"));
  const defaults = defaultPlanLimits[plan];
  const maxSupplyByPlan = {
    free: 5,
    starter: 50,
    creator: 300,
    pro: 1000,
    enterprise: 10000,
    ...((settings.maxSupplyByPlan as Record<string, number> | undefined) ?? {})
  };
  const maxCollectionSize = Number(planConfig?.allowedCollectionSize ?? planConfig?.maxCollectionSupply ?? maxSupplyByPlan[plan] ?? defaults.maxCollectionSize);
  const launchEnabled = Boolean(planConfig?.launchEnabled ?? defaults.launchEnabled);
  const deploymentEnabled = Boolean(planConfig?.deploymentEnabled ?? planConfig?.canDeployContract ?? defaults.deploymentEnabled);

  if (activeSubscription && user && (user.plan !== plan || String(user.subscriptionId ?? "") !== String(activeSubscription._id))) {
    await User.updateOne({ _id: userId }, { plan, subscriptionId: activeSubscription._id });
  }

  return {
    plan,
    source: activeSubscription ? "subscription" : "user",
    subscription: activeSubscription,
    limits: {
      monthlyCredits: planConfig?.monthlyCredits ?? planConfig?.credits ?? defaults.monthlyCredits,
      generations: subscription?.limits?.generations ?? planConfig?.limits?.generations ?? planConfig?.credits ?? defaults.generations,
      maxCollectionSize,
      maxCollectionSupply: maxCollectionSize,
      maxImageSize: Number(planConfig?.maxImageSize ?? defaults.maxImageSize),
      testnetOnly: Boolean(planConfig?.testnetOnly ?? defaults.testnetOnly),
      launchEnabled,
      canPublishLaunchpad: launchEnabled,
      deploymentEnabled,
      canDeployContract: deploymentEnabled,
      marketplaceListingEnabled: Boolean(planConfig?.marketplaceListingEnabled ?? defaults.marketplaceListingEnabled),
      priorityQueue: Boolean(planConfig?.priorityQueue ?? defaults.priorityQueue),
      includedLaunchpadPublishes: planConfig?.includedLaunchpadPublishes ?? defaults.includedLaunchpadPublishes
    }
  };
}

export async function getSubscriptionStatus(userId: string) {
  const activePlan = await getActiveUserPlan(userId);
  const subscription = await Subscription.findOne({ user: userId }).lean();
  if (!subscription) return { currentPlan: activePlan.plan, plan: activePlan.plan, billingPeriod: "free", status: "active", activatedAt: null, expiresAt: null, daysRemaining: null, limits: activePlan.limits, source: activePlan.source };
  const expiresAt = subscription.expiresAt ?? subscription.currentPeriodEnd;
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)) : null;
  return { ...subscription, currentPlan: activePlan.plan, plan: activePlan.plan, status: expired ? "expired" : subscription.status, expiresAt, daysRemaining, limits: activePlan.limits, source: activePlan.source };
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function getPlanLimits(plan: any) {
  return {
    maxCollectionSupply: Number(plan.maxCollectionSupply ?? plan.allowedCollectionSize ?? 0),
    maxCollectionSize: Number(plan.maxCollectionSupply ?? plan.allowedCollectionSize ?? 0),
    maxImageSize: Number(plan.maxImageSize ?? 768),
    monthlyCredits: plan.monthlyCredits ?? plan.credits ?? null,
    testnetOnly: Boolean(plan.testnetOnly),
    canPublishLaunchpad: Boolean(plan.canPublishLaunchpad ?? plan.launchEnabled),
    canDeployContract: Boolean(plan.canDeployContract ?? plan.deploymentEnabled),
    launchEnabled: Boolean(plan.canPublishLaunchpad ?? plan.launchEnabled),
    deploymentEnabled: Boolean(plan.canDeployContract ?? plan.deploymentEnabled),
    marketplaceListingEnabled: Boolean(plan.marketplaceListingEnabled),
    includedLaunchpadPublishes: plan.includedLaunchpadPublishes ?? 0,
    priorityQueue: Boolean(plan.priorityQueue)
  };
}

export async function activateSubscriptionFromPayment(paymentId: string) {
  const payment = await CryptoTransaction.findOne({ paymentId });
  if (!payment?.subscriptionPlan) throw new AppError(400, "Payment is not a subscription payment");
  if (payment.status !== "confirmed") throw new AppError(400, "Subscription payment is not verified");
  const plan = await getSubscriptionPlan(payment.subscriptionPlan);
  if (!plan) throw new AppError(400, "Subscription plan is not configured");
  const user = await User.findById(payment.user);
  if (!user) throw new AppError(404, "User not found");

  const now = new Date();
  const tier = normalizePlan(plan.tier ?? plan.id);
  const billingPeriod = plan.billingPeriod ?? payment.metadata?.interval ?? "monthly";
  const durationDays = typeof plan.durationDays === "number" ? plan.durationDays : billingPeriod === "yearly" ? 365 : billingPeriod === "monthly" ? 30 : null;
  const existing = await Subscription.findOne({ user: user._id });
  const existingExpiresAt = existing?.expiresAt ?? existing?.currentPeriodEnd;
  const samePlan = existing && existing.planId === plan.id && existing.status === "active";
  const extendFrom = samePlan && existingExpiresAt && existingExpiresAt > now ? existingExpiresAt : now;
  const expiresAt = durationDays ? addDays(extendFrom, durationDays) : null;

  const limits = getPlanLimits(plan);
  const update = {
    user: user._id,
    userId: user._id,
    plan: tier,
    planId: plan.id,
    planName: plan.name,
    planTier: tier,
    status: "active",
    interval: billingPeriod,
    billingPeriod,
    activatedAt: samePlan && existing?.activatedAt ? existing.activatedAt : now,
    renewedAt: existing ? now : undefined,
    expiresAt,
    currentPeriodStart: now,
    currentPeriodEnd: expiresAt,
    paymentTxHash: payment.txHash,
    chainId: payment.chainId,
    token: payment.token,
    amountToken: payment.amountToken,
    amountUsd: payment.usdValueAtPayment ?? payment.usdValue,
    lastPayment: payment._id,
    limits: {
      generations: plan.credits ?? existing?.limits?.generations ?? 10,
      monthlyCredits: plan.monthlyCredits ?? plan.credits ?? null,
      maxCollectionSize: limits.maxCollectionSupply,
      maxImageSize: limits.maxImageSize,
      testnetOnly: limits.testnetOnly,
      launchEnabled: limits.launchEnabled,
      marketplaceListingEnabled: limits.marketplaceListingEnabled,
      includedLaunchpadPublishes: limits.includedLaunchpadPublishes
    }
  };

  if (existing && !samePlan) {
    existing.status = "replaced";
    await existing.save();
  }

  const subscription = await Subscription.findOneAndUpdate({ user: user._id }, update, { upsert: true, new: true });
  user.plan = tier as typeof user.plan;
  user.currentPlan = tier as typeof user.currentPlan;
  user.subscriptionId = subscription._id;
  user.planStartedAt = subscription.activatedAt;
  user.planExpiresAt = subscription.expiresAt ?? undefined;
  user.subscriptionStatus = "active";
  user.billingPeriod = billingPeriod;
  user.planLimits = limits;
  await user.save();
  return subscription;
}

export async function expireDueSubscriptions() {
  const settings = await getPlatformSettings();
  const graceDays = Number(settings.subscriptionGracePeriodDays ?? 0);
  const now = new Date();
  const expired = await Subscription.find({ status: { $in: ["active", "grace_period"] }, expiresAt: { $ne: null, $lt: now } });
  for (const subscription of expired) {
    const graceUntil = subscription.expiresAt ? addDays(subscription.expiresAt, graceDays) : now;
    if (graceDays > 0 && subscription.status === "active" && graceUntil > now) {
      subscription.status = "grace_period";
      await subscription.save();
      await User.updateOne({ _id: subscription.user }, { subscriptionStatus: "grace_period" });
      continue;
    }
    subscription.status = "expired";
    await subscription.save();
    await User.updateOne(
      { _id: subscription.user },
      {
        currentPlan: "free",
        plan: "free",
        subscriptionStatus: "expired",
        planExpiresAt: null,
        billingPeriod: "free",
        planLimits: getPlanLimits({ maxCollectionSupply: 10, canPublishLaunchpad: false, canDeployContract: false, priorityQueue: false })
      }
    );
  }
  return expired.length;
}
