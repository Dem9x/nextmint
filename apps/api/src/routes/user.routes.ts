import { randomBytes } from "node:crypto";
import { Router } from "express";
import { getAddress, isAddress, verifyMessage } from "viem";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { User } from "../models/User.js";
import { WalletLinkChallenge } from "../models/WalletLinkChallenge.js";
import { serializeUser } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRouter = Router();

const challengeTtlMs = 10 * 60 * 1000;
const addressBody = z.object({
  address: z.string(),
  chainId: z.number().int().positive().optional()
});

const verifyBody = z.object({
  address: z.string(),
  signature: z.custom<`0x${string}`>(),
  nonce: z.string().min(12),
  chainId: z.number().int().positive().optional()
});

function normalizeAddress(address: string) {
  if (!isAddress(address)) throw new AppError(400, "Invalid wallet address");
  return getAddress(address).toLowerCase();
}

function buildWalletLinkMessage(input: { address: string; userId: string; nonce: string; issuedAt: Date }) {
  return [
    "Link this wallet to your NEXMINT AI account.",
    "",
    `Wallet: ${input.address}`,
    `User ID: ${input.userId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    "",
    "This signature does not authorize a transaction or spend funds."
  ].join("\n");
}

async function assertWalletAvailable(address: string, currentUserId: string) {
  const existingUser = await User.findOne({
    _id: { $ne: currentUserId },
    $or: [
      { walletAddress: address },
      { primaryWallet: address },
      { primaryWalletAddress: address },
      { "linkedWallets.address": address }
    ]
  }).select("_id").lean();

  if (existingUser) throw new AppError(409, "This wallet is already linked to another account.");
}

function safeWalletResponse(user: any) {
  return {
    walletAddress: user.walletAddress ?? user.primaryWallet ?? user.primaryWalletAddress ?? null,
    linkedWallets: user.linkedWallets ?? [],
    walletLinkedAt: user.walletLinkedAt ?? null,
    walletVerifiedAt: user.walletVerifiedAt ?? null
  };
}

userRouter.get("/me/wallet", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id).select("walletAddress primaryWallet primaryWalletAddress linkedWallets walletLinkedAt walletVerifiedAt").lean();
  if (!user) throw new AppError(401, "Invalid account");
  res.json(safeWalletResponse(user));
}));

userRouter.post("/wallet-link/challenge", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = addressBody.parse(req.body);
  const address = normalizeAddress(body.address);
  await assertWalletAvailable(address, req.user!.id);

  const nonce = randomBytes(24).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + challengeTtlMs);
  const message = buildWalletLinkMessage({ address, userId: req.user!.id, nonce, issuedAt });

  await WalletLinkChallenge.create({
    userId: req.user!.id,
    address,
    chainId: body.chainId,
    nonce,
    message,
    expiresAt
  });

  res.json({ message, nonce, expiresAt });
}));

userRouter.post("/wallet-link/verify", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = verifyBody.parse(req.body);
  const address = normalizeAddress(body.address);
  await assertWalletAvailable(address, req.user!.id);

  const challenge = await WalletLinkChallenge.findOne({
    userId: req.user!.id,
    address,
    nonce: body.nonce,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });

  if (!challenge) throw new AppError(400, "Wallet link challenge expired. Try again.");

  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message: challenge.message,
    signature: body.signature
  });
  if (!valid) throw new AppError(401, "Signature rejected.");

  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(401, "Invalid account");

  const now = new Date();
  const existingWallets = ((user as any).linkedWallets ?? []).map((wallet: any) => ({
    address: String(wallet.address).toLowerCase(),
    chainId: wallet.chainId,
    linkedAt: wallet.linkedAt ?? now,
    isPrimary: false
  }));
  const existingIndex = existingWallets.findIndex((wallet: any) => wallet.address === address);

  if (existingIndex >= 0) {
    existingWallets[existingIndex] = { ...existingWallets[existingIndex], chainId: body.chainId ?? challenge.chainId, isPrimary: true };
  } else {
    existingWallets.push({ address, chainId: body.chainId ?? challenge.chainId, linkedAt: now, isPrimary: true });
  }

  (user as any).walletAddress = address;
  (user as any).primaryWallet = address;
  (user as any).primaryWalletAddress = address;
  (user as any).walletLinkedAt = now;
  (user as any).walletVerifiedAt = now;
  (user as any).linkedWallets = existingWallets;
  if (!(user as any).wallets?.includes(address)) (user as any).wallets = [...((user as any).wallets ?? []), address];
  await user.save();

  challenge.usedAt = now;
  await challenge.save();

  res.json({ user: serializeUser(user) });
}));

userRouter.delete("/wallet-link", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(401, "Invalid account");

  (user as any).walletAddress = undefined;
  (user as any).primaryWallet = undefined;
  (user as any).primaryWalletAddress = undefined;
  (user as any).walletLinkedAt = undefined;
  (user as any).walletVerifiedAt = undefined;
  (user as any).linkedWallets = ((user as any).linkedWallets ?? []).map((wallet: any) => ({
    address: String(wallet.address).toLowerCase(),
    chainId: wallet.chainId,
    linkedAt: wallet.linkedAt,
    isPrimary: false
  }));
  await user.save();

  res.json({ user: serializeUser(user), ...safeWalletResponse(user) });
}));
