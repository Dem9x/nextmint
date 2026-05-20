import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { CryptoTransaction } from "../models/CryptoTransaction.js";
import { AppError } from "../middleware/error.js";
import { getPlatformSettings, getSubscriptionPlan } from "./platform-settings.service.js";

export type PlanId = "free" | "starter" | "pro" | "enterprise";

const freeLimits = { generations: 10, maxCollectionSize: 10, launchEnabled: false, deploymentEnabled: false };

function isActiveSubscription(subscription: any) {
  if (!subscription) return false;
  const expiresAt = subscription.expiresAt ?? subscription.currentPeriodEnd;
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  return ["active", "grace_period"].includes(subscription.status) && !expired;
}

function normalizePlan(plan?: string): PlanId {
  return ["starter", "pro", "enterprise"].includes(plan ?? "") ? (plan as PlanId) : "free";
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
  const maxSupplyByPlan = {
    free: 0,
    starter: 100,
    pro: 1000,
    enterprise: 10000,
    ...((settings.maxSupplyByPlan as Record<string, number> | undefined) ?? {})
  };
  const maxCollectionSize = Number(planConfig?.allowedCollectionSize ?? maxSupplyByPlan[plan] ?? 0);
  const launchEnabled = Boolean(planConfig?.launchEnabled ?? maxCollectionSize > 0);
  const deploymentEnabled = Boolean(planConfig?.deploymentEnabled ?? plan !== "free");

  if (activeSubscription && user && (user.plan !== plan || String(user.subscriptionId ?? "") !== String(activeSubscription._id))) {
    await User.updateOne({ _id: userId }, { plan, subscriptionId: activeSubscription._id });
  }

  return {
    plan,
    source: activeSubscription ? "subscription" : "user",
    subscription: activeSubscription,
    limits: {
      generations: subscription?.limits?.generations ?? planConfig?.limits?.generations ?? freeLimits.generations,
      maxCollectionSize,
      maxCollectionSupply: maxCollectionSize,
      launchEnabled,
      canPublishLaunchpad: launchEnabled,
      deploymentEnabled,
      canDeployContract: deploymentEnabled,
      priorityQueue: Boolean(planConfig?.priorityQueue)
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
    canPublishLaunchpad: Boolean(plan.canPublishLaunchpad ?? plan.launchEnabled),
    canDeployContract: Boolean(plan.canDeployContract ?? plan.deploymentEnabled),
    launchEnabled: Boolean(plan.canPublishLaunchpad ?? plan.launchEnabled),
    deploymentEnabled: Boolean(plan.canDeployContract ?? plan.deploymentEnabled),
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
      maxCollectionSize: limits.maxCollectionSupply
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
