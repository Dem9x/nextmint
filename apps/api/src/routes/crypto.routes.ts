import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { createCryptoPayment, getCryptoHistory, verifyCryptoPayment } from "../services/crypto/payment.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const cryptoRouter = Router();
cryptoRouter.use(requireAuth);

cryptoRouter.post("/create-payment", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    walletAddress: z.string(),
    chainId: z.number(),
    token: z.enum(["NATIVE", "ETH", "USDC", "USDT", "DAI"]),
    purpose: z.enum(["credits", "subscription", "mint", "deploy", "publish"]),
    packageId: z.string().optional(),
    plan: z.string().optional(),
    interval: z.enum(["monthly", "yearly"]).optional(),
    usdAmount: z.number().positive().optional(),
    collectionId: z.string().optional()
  }).parse(req.body);
  res.status(201).json(await createCryptoPayment({ ...body, userId: req.user!.id }));
}));

cryptoRouter.post("/verify-payment", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ paymentId: z.string(), txHash: z.custom<`0x${string}`>(), chainId: z.number().optional() }).parse(req.body);
  res.json({ payment: await verifyCryptoPayment({ ...body, userId: req.user!.id }) });
}));

cryptoRouter.get("/history", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ transactions: await getCryptoHistory(req.user!.id) });
}));
