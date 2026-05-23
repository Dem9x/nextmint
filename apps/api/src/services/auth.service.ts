import { nanoid } from "nanoid";
import { getAddress, isAddress, verifyMessage } from "viem";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { WalletConnection } from "../models/WalletConnection.js";
import { AppError } from "../middleware/error.js";
import { applyReferralCode, ensureReferralCode } from "./referral/referral.service.js";
import { getActiveUserPlan } from "./subscription.service.js";
import { createJwt } from "../utils/jwt.js";

export function signToken(user: { _id: unknown; role: string }) {
  return createJwt(user);
}

export function serializeUser(user: any) {
  return {
    id: String(user._id),
    username: user.username ?? user.displayName ?? undefined,
    email: user.email ?? undefined,
    walletAddress: user.walletAddress ?? user.primaryWallet ?? user.primaryWalletAddress ?? undefined,
    linkedWallets: user.linkedWallets ?? [],
    walletLinkedAt: user.walletLinkedAt,
    walletVerifiedAt: user.walletVerifiedAt,
    role: user.role,
    credits: user.credits ?? 0,
    paidCredits: user.paidCredits ?? 0,
    bonusCredits: user.bonusCredits ?? 0,
    plan: user.plan ?? "free",
    activePlan: user.activePlan ?? user.plan ?? "free",
    planSource: user.planSource ?? "user",
    planLimits: user.planLimits,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    subscriptionStatus: user.subscriptionStatus,
    billingPeriod: user.billingPeriod,
    subscriptionId: user.subscriptionId,
    createdAt: user.createdAt
  };
}

export async function registerWithEmail(email: string, password: string, displayName?: string, referralCode?: string, username?: string) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, "Email already registered");
  const user = new User({ email, username: username ?? displayName?.toLowerCase(), displayName, authProvider: "email", authNonce: nanoid(32) });
  await (user as any).setPassword(password);
  await user.save();
  await ensureReferralCode(String(user._id));
  await applyReferralCode(String(user._id), referralCode);
  return { user: await getMe(String(user._id)), token: signToken(user) };
}

export async function loginWithEmail(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user || !(await (user as any).verifyPassword(password))) throw new AppError(401, "Invalid credentials");
  user.lastLoginAt = new Date();
  user.authNonce = nanoid(32);
  await user.save();
  return { user: await getMe(String(user._id)), token: signToken(user) };
}

export function buildWalletMessage(address: string, nonce: string, chainId?: number, issuedAt = new Date()) {
  return `Sign in to NEXMINT AI\nWallet: ${address.toLowerCase()}\nChain ID: ${chainId ?? "unknown"}\nNonce: ${nonce}\nIssued At: ${issuedAt.toISOString()}`;
}

export async function issueWalletNonce(address: string, chainId?: number) {
  if (!isAddress(address)) throw new AppError(400, "Invalid wallet address");
  const normalized = getAddress(address).toLowerCase();
  const nonce = nanoid(32);
  const issuedAt = new Date();
  const message = buildWalletMessage(normalized, nonce, chainId, issuedAt);
  const user = await User.findOneAndUpdate(
    { $or: [{ primaryWallet: normalized }, { primaryWalletAddress: normalized }] },
    { $setOnInsert: { primaryWallet: normalized, primaryWalletAddress: normalized, wallets: [normalized], authProvider: "wallet" }, authNonce: nonce },
    { new: true, upsert: true }
  );
  await WalletConnection.findOneAndUpdate(
    { user: user._id, address: normalized },
    { chainId, connector: "unknown", nonce, nonceMessage: message, nonceExpiresAt: new Date(Date.now() + env.AUTH_NONCE_EXPIRES_MINUTES * 60_000), nonceConsumedAt: null, lastUsedAt: issuedAt, isPrimary: true },
    { upsert: true }
  );
  return { walletAddress: normalized, address: normalized, nonce, message, expiresAt: new Date(Date.now() + env.AUTH_NONCE_EXPIRES_MINUTES * 60_000) };
}

export async function loginWithWallet(address: string, signature: `0x${string}`, chainId?: number, connector = "unknown", referralCode?: string, message?: string) {
  if (!isAddress(address)) throw new AppError(400, "Invalid wallet address");
  const normalized = getAddress(address).toLowerCase();
  const user = await User.findOne({ $or: [{ primaryWallet: normalized }, { primaryWalletAddress: normalized }] });
  if (!user) throw new AppError(400, "Wallet nonce not found");
  const wallet = await WalletConnection.findOne({ user: user._id, address: normalized });
  if (!wallet?.nonce || !wallet.nonceMessage || wallet.nonceConsumedAt) throw new AppError(400, "Wallet nonce not found");
  if (!wallet.nonceExpiresAt || wallet.nonceExpiresAt.getTime() < Date.now()) throw new AppError(400, "Wallet nonce expired");
  if (message && message !== wallet.nonceMessage) throw new AppError(400, "Wallet message mismatch");
  const valid = await verifyMessage({ address: normalized as `0x${string}`, message: wallet.nonceMessage, signature });
  if (!valid) throw new AppError(401, "Invalid wallet signature");
  user.authNonce = nanoid(32);
  user.primaryWallet = normalized;
  user.primaryWalletAddress = normalized;
  user.authProvider = user.email ? user.authProvider : "wallet";
  user.lastLoginAt = new Date();
  if (!user.wallets?.includes(normalized)) user.wallets = [...(user.wallets ?? []), normalized];
  await user.save();
  await ensureReferralCode(String(user._id));
  await applyReferralCode(String(user._id), referralCode);
  await WalletConnection.findOneAndUpdate(
    { user: user._id, address: normalized },
    { chainId, connector, verifiedAt: new Date(), lastUsedAt: new Date(), isPrimary: true, nonceConsumedAt: new Date(), nonce: undefined },
    { upsert: true }
  );
  return { user: await getMe(String(user._id)), token: signToken(user) };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user || user.isBanned) throw new AppError(401, "Invalid account");
  const activePlan = await getActiveUserPlan(userId);
  return serializeUser({
    ...user,
    plan: activePlan.plan,
    activePlan: activePlan.plan,
    planSource: activePlan.source,
    planLimits: activePlan.limits,
    planStartedAt: activePlan.subscription?.activatedAt ?? activePlan.subscription?.currentPeriodStart ?? user.planStartedAt,
    planExpiresAt: activePlan.subscription?.expiresAt ?? activePlan.subscription?.currentPeriodEnd ?? user.planExpiresAt,
    subscriptionStatus: activePlan.subscription?.status ?? user.subscriptionStatus,
    billingPeriod: activePlan.subscription?.billingPeriod ?? activePlan.subscription?.interval ?? user.billingPeriod,
    subscriptionId: activePlan.subscription?._id ?? user.subscriptionId
  });
}
