import crypto from "node:crypto";
import { decodeEventLog, isAddress, keccak256, toBytes, zeroAddress } from "viem";
import { CreditTransaction } from "../../models/CreditTransaction.js";
import { CryptoTransaction } from "../../models/CryptoTransaction.js";
import { User } from "../../models/User.js";
import { AppError } from "../../middleware/error.js";
import { assertSupportedChain, tokenAddresses, type SupportedToken } from "./chains.js";
import { treasuryPaymentAbi } from "./payment-contract.js";
import { waitForConfirmations } from "../blockchain/tx-verifier.service.js";
import { quotePayment, quoteUsdPayment } from "../../pricing/services/crypto-pricing.service.js";
import { getCreditPackage, getSubscriptionPlan } from "../platform-settings.service.js";
import { activateSubscriptionFromPayment } from "../subscription.service.js";
import { addCredits } from "../credits/credit-ledger.service.js";
import { recordPlatformRevenueFromPayment, recordReferralRewardForPayment } from "../revenue/revenue-split.service.js";

// Production note:
// Payment verification rules, abuse checks, and revenue operations should be
// reviewed before mainnet and may belong in a private production module.

export async function createCryptoPayment(input: {
  userId: string;
  walletAddress: string;
  chainId: number;
  token: SupportedToken;
  purpose: "credits" | "subscription" | "mint" | "deploy" | "publish";
  packageId?: string;
  plan?: string;
  interval?: "monthly" | "yearly";
  usdAmount?: number;
  collectionId?: string;
}) {
  if (!isAddress(input.walletAddress)) throw new AppError(400, "Invalid wallet address");
  const chain = assertSupportedChain(input.chainId);
  const quote = typeof input.usdAmount === "number"
    ? await quoteUsdPayment({ chainId: input.chainId, token: input.token, usdAmount: input.usdAmount, purpose: input.purpose })
    : await quotePayment({ chainId: input.chainId, token: input.token, packageId: input.packageId, plan: input.plan, interval: input.interval });
  const paymentId = `pay_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const paymentIdBytes32 = keccak256(toBytes(paymentId));
  const pkg = input.packageId ? await getCreditPackage(input.packageId) : undefined;
  const plan = input.plan ? await getSubscriptionPlan(input.plan) : undefined;
  const usdValue = quote.usdAmount;
  const amount = quote.amountAtomic;
  const isNativeToken = input.token === "NATIVE" || input.token === "ETH";
  const tokenAddress = isNativeToken ? zeroAddress : tokenAddresses[input.chainId]?.[input.token];
  if (!tokenAddress) throw new AppError(400, "Token not supported on selected chain");

  const tx = await CryptoTransaction.create({
    user: input.userId,
    paymentId,
    walletAddress: input.walletAddress.toLowerCase(),
    chainId: input.chainId,
    chainSlug: chain.slug,
    explorerUrl: chain.explorerUrl,
    nativeCurrency: chain.nativeCurrency,
    token: input.token,
    tokenAddress,
    from: input.walletAddress.toLowerCase(),
    to: chain.paymentContract?.toLowerCase(),
    amount,
    amountToken: quote.tokenAmount,
    usdValue,
    priceUsdAtPayment: quote.priceUsd,
    usdValueAtPayment: usdValue,
    pricingProvider: quote.provider,
    priceTimestamp: quote.priceTimestamp,
    quoteExpiresAt: quote.expiresAt,
    isTestnet: chain.isTestnet,
    purpose: input.purpose,
    credits: pkg?.credits ?? plan?.credits,
    subscriptionPlan: input.plan,
    expiresAt: new Date(Date.now() + 30 * 60_000),
    metadata: { packageId: input.packageId, interval: input.interval ?? "monthly", collectionId: input.collectionId }
  });

  return {
    payment: tx,
    transactionRequest: {
      chainId: input.chainId,
      to: chain.paymentContract,
      token: tokenAddress,
      amount,
      value: isNativeToken ? amount : "0",
      paymentId,
      paymentIdBytes32,
      purpose: input.purpose
    }
  };
}

export async function verifyCryptoPayment(input: { userId: string; paymentId: string; txHash: `0x${string}`; chainId?: number }) {
  const payment = await CryptoTransaction.findOne({ paymentId: input.paymentId, user: input.userId });
  if (!payment) throw new AppError(404, "Payment not found");
  if (input.chainId && input.chainId !== payment.chainId) throw new AppError(400, "Payment chain mismatch");
  if (payment.quoteExpiresAt && payment.quoteExpiresAt.getTime() < Date.now()) throw new AppError(400, "Payment quote expired");
  const chain = assertSupportedChain(payment.chainId);
  const processed = await CryptoTransaction.findOne({ chainId: payment.chainId, txHash: input.txHash.toLowerCase(), status: "confirmed", _id: { $ne: payment._id } }).lean();
  if (processed) throw new AppError(409, "Transaction hash has already been processed");
  const { receipt, confirmations } = await waitForConfirmations({ chainId: payment.chainId, txHash: input.txHash });
  if (receipt.status !== "success") throw new AppError(400, "Transaction failed on-chain");
  if (receipt.to?.toLowerCase() !== chain.paymentContract?.toLowerCase()) throw new AppError(400, "Transaction sent to invalid contract");

  const paymentIdBytes32 = keccak256(toBytes(payment.paymentId));
  const event = receipt.logs
    .map((log) => {
      try {
        return decodeEventLog({ abi: treasuryPaymentAbi, data: log.data, topics: log.topics }) as any;
      } catch {
        return undefined;
      }
    })
    .find((decoded) => decoded?.eventName === "PaymentReceived" && decoded.args.paymentId === paymentIdBytes32);

  if (!event || event.args.payer.toLowerCase() !== payment.walletAddress) throw new AppError(400, "Payment event mismatch");
  if (event.args.amount < BigInt(payment.amount)) throw new AppError(400, "Payment amount too low");

  payment.status = "confirmed";
  payment.txHash = input.txHash.toLowerCase();
  payment.confirmations = confirmations;
  payment.from = String(event.args.payer).toLowerCase();
  payment.to = chain.paymentContract?.toLowerCase();
  payment.chainSlug = chain.slug;
  payment.explorerUrl = chain.explorerUrl;
  payment.nativeCurrency = chain.nativeCurrency;
  payment.isTestnet = chain.isTestnet;
  await payment.save();

  const user = await User.findById(payment.user);
  if (!user) throw new AppError(404, "User not found");
  if (payment.credits) {
    user.credits += payment.credits;
    await addCredits({ userId: String(user._id), amount: payment.credits, type: payment.purpose === "subscription" ? "purchase" : "purchase", sourceId: payment._id, paid: true, metadata: { paymentId: payment.paymentId } });
    await CreditTransaction.create({
      user: user._id,
      delta: payment.credits,
      balanceAfter: user.credits,
      reason: payment.purpose === "subscription" ? "subscription" : "purchase",
      reference: payment._id,
      referenceModel: "CryptoTransaction"
    });
  }
  if (payment.subscriptionPlan) {
    await activateSubscriptionFromPayment(payment.paymentId);
  }
  await user.save();
  await recordPlatformRevenueFromPayment(payment);
  await recordReferralRewardForPayment(payment);
  return payment;
}

export async function getCryptoHistory(userId: string) {
  return CryptoTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
}
