import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth, type AuthRequest } from "../middleware/auth.js";
import { CryptoTransaction } from "../models/CryptoTransaction.js";
import { Generation } from "../models/Generation.js";
import { NFTCollection } from "../models/NFTCollection.js";
import { User } from "../models/User.js";
import { AIUsageLog } from "../models/AIUsageLog.js";
import { CreatorPayout } from "../models/CreatorPayout.js";
import { getAdminSummary } from "../controllers/dashboard.controller.js";
import { updatePayoutStatus } from "../services/earnings/payout.service.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { Subscription } from "../models/Subscription.js";
import { getPlatformSettings } from "../services/platform-settings.service.js";
import { listTreasuryBalances, syncAllTreasuryBalances } from "../services/treasury/treasury-balance.service.js";
import { getTreasuryWithdrawAccess } from "../services/treasury/treasury-withdraw-access.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", asyncHandler(async (_req, res) => {
  res.json({ users: await User.find().sort({ createdAt: -1 }).limit(100).select("-passwordHash").lean() });
}));

adminRouter.get("/stats", asyncHandler(async (_req, res) => {
  const [users, collections, generations, revenue] = await Promise.all([
    User.countDocuments(),
    NFTCollection.countDocuments(),
    Generation.countDocuments(),
    CryptoTransaction.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: "$token", usd: { $sum: "$usdValue" }, count: { $sum: 1 } } }])
  ]);
  const [creditsSold, creditsSpent, estimatedCost] = await Promise.all([
    CryptoTransaction.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: null, credits: { $sum: "$credits" }, revenueUsd: { $sum: "$usdValue" } } }]),
    AIUsageLog.aggregate([{ $group: { _id: null, credits: { $sum: "$creditsCharged" } } }]),
    AIUsageLog.aggregate([{ $match: { estimatedCostUsd: { $ne: null } } }, { $group: { _id: null, costUsd: { $sum: "$estimatedCostUsd" } } }])
  ]);
  const revenueFromCredits = creditsSold[0]?.revenueUsd ?? 0;
  const estimatedAIUsageCost = estimatedCost[0]?.costUsd ?? null;
  res.json({
    users,
    collections,
    generations,
    revenue,
    creditEconomics: {
      creditsSold: creditsSold[0]?.credits ?? 0,
      creditsSpent: creditsSpent[0]?.credits ?? 0,
      remainingUserCreditLiability: Math.max((creditsSold[0]?.credits ?? 0) - (creditsSpent[0]?.credits ?? 0), 0),
      estimatedAIUsageCost,
      grossMarginEstimate: estimatedAIUsageCost === null ? null : revenueFromCredits - estimatedAIUsageCost
    }
  });
}));

adminRouter.get("/dashboard/summary", getAdminSummary);

adminRouter.get("/treasury/balances", asyncHandler(async (_req, res) => {
  res.json({ balances: await listTreasuryBalances() });
}));

adminRouter.post("/treasury/sync", asyncHandler(async (_req, res) => {
  res.json({ balances: await syncAllTreasuryBalances() });
}));

adminRouter.get("/treasury/withdraw-access", asyncHandler(async (req: AuthRequest, res) => {
  const query = z.object({
    chainId: z.coerce.number().int(),
    walletAddress: z.string().optional()
  }).parse(req.query);
  const { chainId, walletAddress } = query;
  if (!req.user?.walletAddress) {
    res.status(403).json({ error: "Admin must sign in with the treasury owner wallet" });
    return;
  }
  if (walletAddress && req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    res.status(403).json({ error: "Authenticated admin wallet does not match connected wallet" });
    return;
  }
  const access = await getTreasuryWithdrawAccess({ chainId, userWalletAddress: req.user.walletAddress });
  if (!access.allowed) {
    res.status(403).json({ error: access.reason, access });
    return;
  }
  res.json(access);
}));

adminRouter.get("/payouts", asyncHandler(async (_req, res) => {
  res.json({ payouts: await CreatorPayout.find().sort({ createdAt: -1 }).limit(100).lean() });
}));

adminRouter.get("/subscriptions", asyncHandler(async (_req, res) => {
  res.json({ subscriptions: await Subscription.find().sort({ updatedAt: -1 }).limit(200).lean() });
}));

adminRouter.patch("/subscriptions/:id/extend", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ extraDays: z.number().int().positive(), reason: z.string().optional() }).parse(req.body);
  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw new Error("Subscription not found");
  const base = subscription.expiresAt && subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
  subscription.expiresAt = new Date(base.getTime() + body.extraDays * 86_400_000);
  subscription.currentPeriodEnd = subscription.expiresAt;
  subscription.status = "active";
  subscription.renewedAt = new Date();
  subscription.pendingPlanChange = { adminExtensionReason: body.reason, updatedByAdminId: req.user!.id };
  await subscription.save();
  await User.updateOne({ _id: subscription.user }, { subscriptionStatus: "active", planExpiresAt: subscription.expiresAt });
  res.json({ subscription });
}));

adminRouter.patch("/plans/:id", asyncHandler(async (req, res) => {
  const settings = await getPlatformSettings();
  const plans = [...((settings.subscriptionPlans as any[]) ?? [])];
  const index = plans.findIndex((plan) => plan.id === req.params.id);
  if (index < 0) throw new Error("Plan not found");
  plans[index] = { ...plans[index], ...req.body, id: req.params.id };
  settings.subscriptionPlans = plans;
  await settings.save();
  res.json({ plan: plans[index], plans });
}));

adminRouter.post("/plans", asyncHandler(async (req, res) => {
  const body = z.object({ id: z.string().min(2), tier: z.enum(["free", "starter", "pro", "enterprise"]), name: z.string(), billingPeriod: z.enum(["free", "monthly", "yearly", "custom"]), durationDays: z.number().int().positive().nullable().optional(), priceUsd: z.number().nullable().optional(), credits: z.number().nullable().optional() }).passthrough().parse(req.body);
  const settings = await getPlatformSettings();
  const plans = [...((settings.subscriptionPlans as any[]) ?? [])];
  if (plans.some((plan) => plan.id === body.id)) throw new Error("Plan id already exists");
  plans.push(body);
  settings.subscriptionPlans = plans;
  await settings.save();
  res.status(201).json({ plan: body, plans });
}));

adminRouter.post("/payouts/:id/approve", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ payout: await updatePayoutStatus(req.params.id, "approved", req.user!.id) });
}));

adminRouter.post("/payouts/:id/reject", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ payout: await updatePayoutStatus(req.params.id, "rejected", req.user!.id, { rejectionReason: req.body?.reason }) });
}));

adminRouter.post("/payouts/:id/mark-paid", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ payout: await updatePayoutStatus(req.params.id, "paid", req.user!.id, { txHash: req.body?.txHash }) });
}));

adminRouter.get("/settings", asyncHandler(async (_req, res) => {
  res.json({ settings: await getPlatformSettings() });
}));

adminRouter.patch("/settings", asyncHandler(async (req: AuthRequest, res) => {
  const allowed = [
    "platformMintFeePercent",
    "platformMintFeeBps",
    "referralRewardPercent",
    "referralRewardBps",
    "publishFeeUsd",
    "launchFeeUsd",
    "deployServiceFeeUsd",
    "creatorPayoutDelayDays",
    "maxSupplyByPlan",
    "creditPackages",
    "subscriptionPlans",
    "subscriptionGracePeriodDays",
    "supportedPayoutTokens",
    "minimumPayoutUsd",
    "payoutReviewRequired",
    "manualPrices"
  ];
  const update = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => allowed.includes(key)));
  res.json({ settings: await PlatformSettings.findOneAndUpdate({ singletonKey: "default" }, { ...update, updatedByAdminId: req.user!.id }, { upsert: true, new: true }) });
}));
