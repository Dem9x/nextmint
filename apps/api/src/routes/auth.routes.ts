import { Router } from "express";
import { z } from "zod";
import { authLimiter } from "../middleware/rate-limit.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getMe, issueWalletNonce, loginWithEmail, loginWithWallet, registerWithEmail } from "../services/auth.service.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ username: z.string().min(3).max(40).optional(), email: z.string().email(), password: z.string().min(10), displayName: z.string().optional(), referralCode: z.string().optional() }).parse(req.body);
  const result = await registerWithEmail(body.email, body.password, body.displayName ?? body.username, body.referralCode, body.username);
  res.status(201).json(result);
}));

authRouter.post("/login", authLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  res.json(await loginWithEmail(body.email, body.password));
}));

authRouter.post("/wallet/nonce", authLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ address: z.string().min(42).optional(), walletAddress: z.string().min(42).optional(), chainId: z.number().optional() }).parse(req.body);
  res.json(await issueWalletNonce(body.walletAddress ?? body.address!, body.chainId));
}));

authRouter.post("/wallet", authLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ address: z.string().optional(), walletAddress: z.string().optional(), signature: z.custom<`0x${string}`>(), chainId: z.number().optional(), connector: z.string().optional(), referralCode: z.string().optional(), message: z.string().optional() }).parse(req.body);
  res.json(await loginWithWallet(body.walletAddress ?? body.address!, body.signature, body.chainId, body.connector, body.referralCode, body.message));
}));

authRouter.post("/wallet/verify", authLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ walletAddress: z.string(), signature: z.custom<`0x${string}`>(), chainId: z.number().optional(), connector: z.string().optional(), referralCode: z.string().optional(), message: z.string() }).parse(req.body);
  res.json(await loginWithWallet(body.walletAddress, body.signature, body.chainId, body.connector, body.referralCode, body.message));
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  res.json({ user: await getMe(req.user!.id) });
}));

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

authRouter.post("/google", authLimiter, asyncHandler(async (_req, res) => {
  res.status(501).json({ error: "Configure Google OAuth client and callback before enabling Google login" });
}));
