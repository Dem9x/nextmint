import { Types } from "mongoose";
import { AIUsageLog } from "../../models/AIUsageLog.js";
import { ContractDeployment } from "../../models/ContractDeployment.js";
import { CreditLedger } from "../../models/CreditLedger.js";
import { CreatorEarning } from "../../models/CreatorEarning.js";
import { CreatorPayout } from "../../models/CreatorPayout.js";
import { CryptoTransaction } from "../../models/CryptoTransaction.js";
import { Generation } from "../../models/Generation.js";
import { MarketplaceListing } from "../../models/MarketplaceListing.js";
import { Mint } from "../../models/Mint.js";
import { MintRecord } from "../../models/MintRecord.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { PlatformRevenue } from "../../models/PlatformRevenue.js";
import { ReferralReward } from "../../models/ReferralReward.js";
import { Subscription } from "../../models/Subscription.js";
import { TreasuryBalance } from "../../models/TreasuryBalance.js";
import { User } from "../../models/User.js";
import { getGatewayUrl } from "../ipfs/ipfs.service.js";

function objectId(id: string) {
  return new Types.ObjectId(id);
}

function startForRange(range = "30d") {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(Date.now() - days * 86_400_000);
}

function dayGroup(field = "$createdAt") {
  return { $dateToString: { format: "%Y-%m-%d", date: field as any } };
}

export async function userSummary(userId: string) {
  const id = objectId(userId);
  const [totalCollections, totalNFTsGenerated, ownedMints, launchpadMints, subscription, spend, earnings, payouts, balance] = await Promise.all([
    NFTCollection.countDocuments({ owner: id }),
    Generation.countDocuments({ user: id }),
    Mint.countDocuments({ user: id, status: "confirmed" }),
    MintRecord.countDocuments({ userId: id, status: "confirmed" }),
    Subscription.findOne({ user: id, status: "active" }).lean(),
    CryptoTransaction.aggregate([{ $match: { user: id, status: "confirmed" } }, { $group: { _id: null, usd: { $sum: "$usdValueAtPayment" } } }]),
    CreatorEarning.aggregate([{ $match: { creatorId: id } }, { $group: { _id: "$status", usd: { $sum: "$netAmountUsd" } } }]),
    CreatorPayout.aggregate([{ $match: { creatorId: id } }, { $group: { _id: "$status", usd: { $sum: "$amountUsd" } } }]),
    CreditLedger.aggregate([{ $match: { userId: id } }, { $group: { _id: null, credits: { $sum: "$amount" } } }])
  ]);
  const available = earnings.find((x) => x._id === "available")?.usd ?? 0;
  const pending = earnings.find((x) => x._id === "pending")?.usd ?? 0;
  return {
    totalCollections,
    totalNFTsGenerated,
    totalMints: ownedMints + launchpadMints,
    totalCredits: balance[0]?.credits ?? 0,
    paidCredits: null,
    bonusCredits: null,
    activeSubscription: subscription,
    totalSpentUsd: spend[0]?.usd ?? 0,
    totalEarnedUsd: available + pending + (earnings.find((x) => x._id === "paid")?.usd ?? 0),
    availablePayoutUsd: available,
    pendingPayoutUsd: pending + (payouts.find((x) => x._id === "requested")?.usd ?? 0)
  };
}

export async function creatorSummary(userId: string) {
  const id = objectId(userId);
  const [creator, collections, earnings, recentEarnings, mints, topCollections, payoutStats] = await Promise.all([
    User.findById(id).select("displayName username email avatarUrl walletAddress primaryWallet primaryWalletAddress plan currentPlan credits createdAt").lean(),
    NFTCollection.countDocuments({ owner: id, status: { $in: ["published", "minting_live", "sold_out"] } }),
    CreatorEarning.aggregate([{ $match: { creatorId: id } }, { $group: { _id: "$status", usd: { $sum: "$netAmountUsd" } } }]),
    CreatorEarning.find({ creatorId: id }).sort({ createdAt: -1 }).limit(8).lean(),
    MintRecord.aggregate([
      { $lookup: { from: "nftcollections", localField: "collectionId", foreignField: "_id", as: "collection" } },
      { $unwind: "$collection" },
      { $match: { "collection.owner": id, status: "confirmed" } },
      { $group: { _id: null, quantity: { $sum: "$quantity" } } }
    ]),
    NFTCollection.find({ owner: id }).sort({ totalMinted: -1, launchAt: -1 }).limit(6).select("name slug description totalMinted maxSupply chainId status coverImageUrl bannerImageUrl profileImageUrl mintPrice contractAddress updatedAt").lean(),
    CreatorPayout.aggregate([{ $match: { creatorId: id } }, { $group: { _id: "$status", usd: { $sum: "$amountUsd" } } }])
  ]);
  const available = earnings.find((x) => x._id === "available")?.usd ?? 0;
  const pending = earnings.find((x) => x._id === "pending")?.usd ?? 0;
  const paid = earnings.find((x) => x._id === "paid")?.usd ?? 0;
  const requestedPayout = payoutStats.find((x) => x._id === "requested")?.usd ?? 0;
  return {
    creator: creator ? {
      id: String(creator._id),
      displayName: creator.displayName ?? creator.username ?? "NEXMINT Creator",
      username: creator.username,
      email: creator.email,
      avatarUrl: creator.avatarUrl,
      walletAddress: creator.walletAddress ?? creator.primaryWallet ?? creator.primaryWalletAddress,
      plan: creator.currentPlan ?? creator.plan ?? "free",
      credits: creator.credits ?? 0,
      createdAt: creator.createdAt
    } : null,
    totalCollectionsLaunched: collections,
    totalMintRevenueUsd: available + pending + paid,
    totalPlatformFeesUsd: 0,
    totalCreatorEarningsUsd: available + pending + paid,
    availableEarningsUsd: available,
    pendingEarningsUsd: pending,
    requestedPayoutUsd: requestedPayout,
    totalMints: mints[0]?.quantity ?? 0,
    topCollections,
    recentEarnings
  };
}

export async function adminSummary() {
  const [totalUsers, activeUsers, totalCollections, totalMints, platformRevenue, creatorPayouts, referralRewards, aiCost, treasuryBalances, revenueByChain, revenueBySource, failedTransactions, pendingPayouts] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } }),
    NFTCollection.countDocuments(),
    MintRecord.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: null, quantity: { $sum: "$quantity" } } }]),
    PlatformRevenue.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: null, gross: { $sum: "$grossAmountUsd" }, platform: { $sum: "$platformFeeUsd" } } }]),
    CreatorPayout.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, usd: { $sum: "$amountUsd" } } }]),
    ReferralReward.aggregate([{ $match: { status: { $in: ["available", "claimed"] } } }, { $group: { _id: null, usd: { $sum: "$amountUsd" } } }]),
    AIUsageLog.aggregate([{ $match: { estimatedCostUsd: { $ne: null } } }, { $group: { _id: null, usd: { $sum: "$estimatedCostUsd" } } }]),
    TreasuryBalance.find().sort({ chainId: 1, token: 1 }).lean(),
    PlatformRevenue.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: "$chainId", usd: { $sum: "$platformFeeUsd" }, count: { $sum: 1 } } }]),
    PlatformRevenue.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: "$sourceType", usd: { $sum: "$platformFeeUsd" }, count: { $sum: 1 } } }]),
    CryptoTransaction.countDocuments({ status: "failed" }),
    CreatorPayout.countDocuments({ status: "requested" })
  ]);
  return {
    totalUsers,
    activeUsers,
    totalCollections,
    totalMints: totalMints[0]?.quantity ?? 0,
    grossRevenueUsd: platformRevenue[0]?.gross ?? 0,
    platformRevenueUsd: platformRevenue[0]?.platform ?? 0,
    creatorPayoutsUsd: creatorPayouts[0]?.usd ?? 0,
    referralRewardsUsd: referralRewards[0]?.usd ?? 0,
    AIUsageCostUsd: aiCost[0]?.usd ?? null,
    treasuryBalances,
    revenueByChain,
    revenueBySource,
    failedTransactions,
    pendingPayouts
  };
}

export async function revenueChart(range: string, chainId?: number) {
  const match: any = { status: "confirmed", createdAt: { $gte: startForRange(range) } };
  if (chainId) match.chainId = chainId;
  return PlatformRevenue.aggregate([{ $match: match }, { $group: { _id: dayGroup(), grossUsd: { $sum: "$grossAmountUsd" }, platformUsd: { $sum: "$platformFeeUsd" } } }, { $sort: { _id: 1 } }]);
}

export async function mintChart(range: string, chainId?: number) {
  const match: any = { status: "confirmed", createdAt: { $gte: startForRange(range) } };
  if (chainId) match.chainId = chainId;
  return MintRecord.aggregate([{ $match: match }, { $group: { _id: dayGroup(), mints: { $sum: "$quantity" } } }, { $sort: { _id: 1 } }]);
}

export async function aiUsageChart(range: string) {
  return AIUsageLog.aggregate([{ $match: { createdAt: { $gte: startForRange(range) } } }, { $group: { _id: dayGroup(), credits: { $sum: "$creditsCharged" }, costUsd: { $sum: "$estimatedCostUsd" }, requests: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
}

export async function earningsChart(userId: string, range: string) {
  return CreatorEarning.aggregate([{ $match: { creatorId: objectId(userId), createdAt: { $gte: startForRange(range) } } }, { $group: { _id: dayGroup(), usd: { $sum: "$netAmountUsd" } } }, { $sort: { _id: 1 } }]);
}

export async function recentTransactions(userId?: string) {
  const match = userId ? { user: objectId(userId) } : {};
  return CryptoTransaction.find(match).sort({ createdAt: -1 }).limit(20).lean();
}

export async function userOwnedNfts(userId: string) {
  const user = await User.findById(userId).lean();
  const wallet = user?.primaryWallet ?? user?.primaryWalletAddress;
  const ownerFilters: any[] = [{ userId: objectId(userId), mintStatus: "minted" }];
  if (wallet) ownerFilters.push({ ownerWallet: wallet.toLowerCase(), mintStatus: "minted" });
  const nfts = await NFTItem.find({ $or: ownerFilters })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(24)
    .lean();
  const assetKeys = nfts
    .filter((nft) => nft.chainId && nft.contractAddress && nft.tokenId)
    .map((nft) => ({ chainId: nft.chainId, nftContract: nft.contractAddress, tokenId: nft.tokenId }));
  const listings = assetKeys.length ? await MarketplaceListing.find({ $or: assetKeys, status: "active" }).lean() : [];
  const listingByAsset = new Map(listings.map((listing) => [`${listing.chainId}:${listing.nftContract}:${listing.tokenId}`, listing]));
  return nfts.map((nft) => ({
    ...nft,
    imageGatewayUrl: nft.imageIpfsUri ? getGatewayUrl(nft.imageIpfsUri) : undefined,
    metadataGatewayUrl: nft.metadataIpfsUri ? getGatewayUrl(nft.metadataIpfsUri) : nft.metadataGatewayUrl,
    marketplaceListing: nft.chainId && nft.contractAddress && nft.tokenId
      ? listingByAsset.get(`${nft.chainId}:${nft.contractAddress}:${nft.tokenId}`)
      : undefined
  }));
}
