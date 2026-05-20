import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { getSubscriptionStatus } from "../services/subscription.service.js";
import { createCryptoPayment, verifyCryptoPayment } from "../services/crypto/payment.service.js";
import { getSubscriptionPlan } from "../services/platform-settings.service.js";
import { Subscription } from "../models/Subscription.js";
import { AppError } from "../middleware/error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth);

subscriptionRouter.post("/upgrade", asyncHandler(async (req, res) => {
  const body = z.object({ chainId: z.number().int(), token: z.string(), plan: z.string(), interval: z.enum(["monthly", "yearly"]).default("monthly") }).parse(req.body);
  res.status(202).json({ message: "Use /api/subscription/quote and /api/subscription/verify-payment for duration-aware subscriptions.", legacyInput: body });
}));

subscriptionRouter.post("/quote", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    planId: z.string(),
    chainId: z.number().int(),
    token: z.enum(["NATIVE", "ETH", "USDC", "USDT", "DAI"]).default("NATIVE"),
    walletAddress: z.string().optional()
  }).parse(req.body);
  const plan = await getSubscriptionPlan(body.planId);
  if (!plan) throw new AppError(404, "Subscription plan not found");
  const walletAddress = body.walletAddress ?? req.user!.walletAddress;
  if (!walletAddress) throw new AppError(400, "Wallet login is required before buying a subscription");
  const result = await createCryptoPayment({
    userId: req.user!.id,
    walletAddress,
    chainId: body.chainId,
    token: body.token,
    purpose: "subscription",
    plan: plan.id,
    interval: plan.billingPeriod === "yearly" ? "yearly" : "monthly"
  });
  res.status(201).json({
    paymentId: result.payment.paymentId,
    planId: plan.id,
    planName: plan.name,
    billingPeriod: plan.billingPeriod,
    durationDays: plan.durationDays,
    usdAmount: result.payment.usdValueAtPayment,
    priceUsdAtPayment: result.payment.priceUsdAtPayment,
    priceUsd: result.payment.priceUsdAtPayment,
    provider: result.payment.pricingProvider,
    expiresAt: result.payment.quoteExpiresAt,
    isFallback: false,
    contractAddress: result.transactionRequest.to,
    tokenAmount: result.payment.amountToken,
    token: result.payment.token,
    activatedAfterPayment: true,
    quoteExpiresAt: result.payment.quoteExpiresAt,
    transactionRequest: result.transactionRequest
  });
}));

subscriptionRouter.post("/verify-payment", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ paymentId: z.string(), txHash: z.custom<`0x${string}`>(), chainId: z.number().int() }).parse(req.body);
  await verifyCryptoPayment({ userId: req.user!.id, paymentId: body.paymentId, txHash: body.txHash, chainId: body.chainId });
  const subscription = await getSubscriptionStatus(req.user!.id);
  res.json(subscription);
}));

subscriptionRouter.get("/status", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await getSubscriptionStatus(req.user!.id));
}));

subscriptionRouter.post("/cancel", asyncHandler(async (req: AuthRequest, res) => {
  const subscription = await Subscription.findOne({ user: req.user!.id, status: { $in: ["active", "grace_period"] } });
  if (!subscription) throw new AppError(404, "Active subscription not found");
  subscription.autoRenewEnabled = false;
  subscription.cancelledAt = new Date();
  await subscription.save();
  res.json({ status: subscription.status, autoRenewEnabled: false, expiresAt: subscription.expiresAt });
}));
