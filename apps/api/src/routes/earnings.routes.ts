import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { CreatorEarning } from "../models/CreatorEarning.js";
import { CreditLedger } from "../models/CreditLedger.js";
import { Referral } from "../models/Referral.js";
import { ReferralReward } from "../models/ReferralReward.js";
import { ensureReferralCode } from "../services/referral/referral.service.js";
import { requestPayout } from "../services/earnings/payout.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const earningsRouter = Router();
earningsRouter.use(requireAuth);

earningsRouter.get("/summary", asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const referralCode = await ensureReferralCode(userId);
  const [creatorEarnings, referralRewards, referrals, creditLedger] = await Promise.all([
    CreatorEarning.find({ creatorId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    ReferralReward.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    CreditLedger.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
  ]);
  res.json({ referralCode, referralLink: `/register?ref=${referralCode}`, creatorEarnings, referralRewards, referrals, creditLedger });
}));

earningsRouter.post("/request-payout", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ chainId: z.number().int(), token: z.string(), walletAddress: z.string() }).parse(req.body);
  res.status(201).json({ payout: await requestPayout({ creatorId: req.user!.id, ...body }) });
}));
