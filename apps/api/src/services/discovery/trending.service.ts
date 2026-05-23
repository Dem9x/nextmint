import { Types } from "mongoose";
import { MarketplaceListing } from "../../models/MarketplaceListing.js";
import { MarketplaceTrade } from "../../models/MarketplaceTrade.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { User } from "../../models/User.js";
import { buildCollectionBadgeState, isProCreatorPlan } from "../creators/public-creator.service.js";
import { getCollectionMarketplaceStats } from "../marketplace/marketplace-stats.service.js";

function sinceFor(window?: string) {
  if (window === "24h") return new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (window === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return undefined;
}

export async function calculateCollectionTrendingScore(collectionId: string) {
  const collection = await NFTCollection.findById(collectionId).select("likeCount viewCount owner creatorId isVerifiedCollection").lean();
  if (!collection) return 0;
  const [totalSales, activeListings, recentSales24h, creator] = await Promise.all([
    MarketplaceTrade.countDocuments({ collectionId: new Types.ObjectId(collectionId) }),
    MarketplaceListing.countDocuments({ collectionId: new Types.ObjectId(collectionId), status: "active" }),
    MarketplaceTrade.countDocuments({ collectionId: new Types.ObjectId(collectionId), timestamp: { $gte: sinceFor("24h") } }),
    User.findById(collection.creatorId ?? collection.owner).select("currentPlan plan isVerifiedCreator").lean()
  ]);
  const verifiedBoost = collection.isVerifiedCollection || creator?.isVerifiedCreator ? 10 : 0;
  const proBoost = isProCreatorPlan(creator?.currentPlan ?? creator?.plan) ? 5 : 0;
  return (collection.likeCount ?? 0) * 5 + (collection.viewCount ?? 0) + totalSales * 10 + activeListings * 2 + recentSales24h * 15 + verifiedBoost + proBoost;
}

export async function calculateNFTTrendingScore(itemId: string) {
  const item = await NFTItem.findById(itemId).select("likeCount viewCount chainId contractAddress tokenId").lean();
  if (!item) return 0;
  const [recentSales, activeListing] = await Promise.all([
    MarketplaceTrade.countDocuments({ nftItemId: item._id, timestamp: { $gte: sinceFor("24h") } }),
    MarketplaceListing.exists({ nftItemId: item._id, status: "active" })
  ]);
  return (item.likeCount ?? 0) * 5 + (item.viewCount ?? 0) + recentSales * 20 + (activeListing ? 5 : 0);
}

export async function getTrendingCollections(input: { chainId?: number; limit?: number; window?: string } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 50);
  const collections = await NFTCollection.find({
    ...(input.chainId ? { chainId: input.chainId } : {}),
    status: { $in: ["published", "minting_live", "sold_out"] }
  })
    .sort({ trendingScore: -1, likeCount: -1, viewCount: -1, updatedAt: -1 })
    .limit(limit)
    .select("name slug chainId contractAddress coverImageUrl profileImageUrl bannerImageUrl likeCount viewCount trendingScore owner creatorId isVerifiedCollection collectionBadge")
    .lean();

  return Promise.all(collections.map(async (collection) => {
    const [stats, creator] = await Promise.all([
      getCollectionMarketplaceStats({ collectionId: String(collection._id) }),
      User.findById(collection.creatorId ?? collection.owner).select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge").lean()
    ]);
    return { ...collection, ...buildCollectionBadgeState(collection, creator), floorPrice: stats.floorPrice, totalVolume: stats.totalVolume };
  }));
}

export async function getTrendingNFTs(input: { chainId?: number; collectionId?: string; limit?: number; window?: string } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  return NFTItem.find({
    ...(input.chainId ? { chainId: input.chainId } : {}),
    ...(input.collectionId ? { collectionId: new Types.ObjectId(input.collectionId) } : {})
  })
    .sort({ trendingScore: -1, likeCount: -1, viewCount: -1, updatedAt: -1 })
    .limit(limit)
    .select("name imageUrl imageIpfsUri chainId contractAddress tokenId collectionId likeCount viewCount trendingScore")
    .populate("collectionId", "name slug")
    .lean();
}

export async function refreshCollectionTrendingScore(collectionId: string) {
  const score = await calculateCollectionTrendingScore(collectionId);
  await NFTCollection.findByIdAndUpdate(collectionId, { trendingScore: score, lastTrendingCalculatedAt: new Date() });
  return score;
}

export async function refreshNFTTrendingScore(itemId: string) {
  const score = await calculateNFTTrendingScore(itemId);
  await NFTItem.findByIdAndUpdate(itemId, { trendingScore: score, lastTrendingCalculatedAt: new Date() });
  return score;
}
