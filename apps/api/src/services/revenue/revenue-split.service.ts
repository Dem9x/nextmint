import { CreatorEarning } from "../../models/CreatorEarning.js";
import { PlatformRevenue } from "../../models/PlatformRevenue.js";
import { Referral } from "../../models/Referral.js";
import { ReferralReward } from "../../models/ReferralReward.js";
import { CryptoTransaction } from "../../models/CryptoTransaction.js";
import { getPlatformSettings } from "../platform-settings.service.js";

export async function calculateMintSplit(grossUsd: number) {
  const settings = await getPlatformSettings();
  const platformFeeUsd = grossUsd * (settings.platformMintFeePercent / 100);
  return {
    grossUsd,
    platformFeeUsd,
    creatorAmountUsd: Math.max(grossUsd - platformFeeUsd, 0),
    referralRewardUsd: platformFeeUsd * (settings.referralRewardPercent / 100)
  };
}

export async function recordPlatformRevenueFromPayment(payment: any) {
  const sourceType = payment.purpose === "subscription" ? "subscription" : payment.purpose === "deploy" ? "deploy_fee" : payment.purpose === "publish" ? "launch_fee" : "credit_purchase";
  return PlatformRevenue.findOneAndUpdate(
    { txHash: payment.txHash, sourceType },
    {
      sourceType,
      userId: payment.user,
      collectionId: payment.metadata?.collectionId,
      chainId: payment.chainId,
      txHash: payment.txHash,
      token: payment.token,
      grossAmountToken: payment.amountToken ?? payment.amount,
      grossAmountUsd: payment.usdValueAtPayment ?? payment.usdValue,
      platformFeeToken: payment.amountToken ?? payment.amount,
      platformFeeUsd: payment.usdValueAtPayment ?? payment.usdValue,
      status: "confirmed"
    },
    { upsert: true, new: true }
  );
}

export async function recordCreatorEarning(input: {
  creatorId: string;
  collectionId?: string;
  chainId: number;
  txHash: string;
  sourceType: string;
  token: string;
  grossAmountToken?: string;
  platformFeeToken?: string;
  netAmountToken?: string;
  netAmountUsd: number;
}) {
  return CreatorEarning.create({ ...input, status: "available", availableAt: new Date() });
}

export async function recordMintRevenue(input: {
  creatorId: string;
  collectionId: string;
  chainId: number;
  txHash: string;
  token: string;
  grossAmountToken: string;
  platformFeeToken: string;
  creatorAmountToken: string;
  grossAmountUsd?: number;
  platformFeeUsd?: number;
  creatorAmountUsd?: number;
}) {
  const [earning, revenue] = await Promise.all([
    CreatorEarning.findOneAndUpdate(
      { txHash: input.txHash.toLowerCase(), collectionId: input.collectionId },
      {
        creatorId: input.creatorId,
        collectionId: input.collectionId,
        chainId: input.chainId,
        txHash: input.txHash.toLowerCase(),
        sourceType: "mint",
        token: input.token,
        grossAmountToken: input.grossAmountToken,
        platformFeeToken: input.platformFeeToken,
        netAmountToken: input.creatorAmountToken,
        netAmountUsd: input.creatorAmountUsd ?? 0,
        status: "available",
        availableAt: new Date()
      },
      { upsert: true, new: true }
    ),
    PlatformRevenue.findOneAndUpdate(
      { txHash: input.txHash.toLowerCase(), sourceType: "mint_fee" },
      {
        sourceType: "mint_fee",
        userId: input.creatorId,
        collectionId: input.collectionId,
        chainId: input.chainId,
        txHash: input.txHash.toLowerCase(),
        token: input.token,
        grossAmountToken: input.grossAmountToken,
        grossAmountUsd: input.grossAmountUsd ?? 0,
        platformFeeToken: input.platformFeeToken,
        platformFeeUsd: input.platformFeeUsd ?? 0,
        creatorAmountToken: input.creatorAmountToken,
        creatorAmountUsd: input.creatorAmountUsd ?? 0,
        status: "confirmed"
      },
      { upsert: true, new: true }
    )
  ]);
  return { earning, revenue };
}

export async function recordReferralRewardForPayment(payment: any) {
  const referral = await Referral.findOne({ referredUserId: payment.user, status: "active" }).lean();
  if (!referral) return undefined;
  const settings = await getPlatformSettings();
  const rewardUsd = (payment.usdValueAtPayment ?? payment.usdValue) * (settings.referralRewardPercent / 100);
  return ReferralReward.findOneAndUpdate(
    { sourceTransactionId: payment._id, referrerId: referral.referrerId },
    {
      referrerId: referral.referrerId,
      referredUserId: payment.user,
      sourceTransactionId: payment._id,
      sourceType: payment.purpose,
      rewardType: "credit",
      amountUsd: rewardUsd,
      creditsAmount: Math.floor(rewardUsd),
      status: "available"
    },
    { upsert: true, new: true }
  );
}

export async function revenueTotals() {
  const [platform, creator, referral] = await Promise.all([
    PlatformRevenue.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: null, usd: { $sum: "$platformFeeUsd" } } }]),
    CreatorEarning.aggregate([{ $match: { status: { $in: ["pending", "available", "paid"] } } }, { $group: { _id: "$status", usd: { $sum: "$netAmountUsd" } } }]),
    ReferralReward.aggregate([{ $match: { status: { $in: ["available", "claimed"] } } }, { $group: { _id: null, usd: { $sum: "$amountUsd" } } }]),
    CryptoTransaction.countDocuments({ status: "failed" })
  ]);
  return { platform, creator, referral };
}
