import { Types } from "mongoose";
import { MarketplaceActivity } from "../../models/MarketplaceActivity.js";
import { MarketplaceListing } from "../../models/MarketplaceListing.js";
import { MarketplaceTrade } from "../../models/MarketplaceTrade.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { User } from "../../models/User.js";
import { buildCollectionBadgeState } from "../creators/public-creator.service.js";
import { resolveMarketplaceAsset } from "./marketplace-asset-resolver.service.js";

type IdLike = string | Types.ObjectId;

function objectId(id?: string) {
  return id ? new Types.ObjectId(id) : undefined;
}

function sumWei(values: Array<string | undefined | null>) {
  return values.reduce((total, value) => total + BigInt(value ?? "0"), 0n).toString();
}

function baseFilter(input?: { chainId?: number; collectionId?: string; nftContract?: string }) {
  const filter: Record<string, unknown> = {};
  if (input?.chainId) filter.chainId = input.chainId;
  if (input?.collectionId) filter.collectionId = objectId(input.collectionId);
  if (input?.nftContract) filter.nftContract = input.nftContract.toLowerCase();
  return filter;
}

export async function getGlobalMarketplaceStats(input: { chainId?: number } = {}) {
  const filter = baseFilter(input);
  const [trades, activeListings, listedCollections] = await Promise.all([
    MarketplaceTrade.find(filter).select("price").lean(),
    MarketplaceListing.countDocuments({ ...filter, status: "active" }),
    MarketplaceListing.distinct("collectionId", { ...filter, status: "active", collectionId: { $exists: true, $ne: null } })
  ]);

  return {
    totalVolume: sumWei(trades.map((trade) => trade.price)),
    totalSales: trades.length,
    activeListings,
    listedCollections: listedCollections.length
  };
}

export async function getCollectionMarketplaceStats(input: { chainId?: number; collectionId?: string; nftContract?: string }) {
  const filter = baseFilter(input);
  const [activeListings, trades, lastSale, activityCount, owners, itemsCount] = await Promise.all([
    MarketplaceListing.find({ ...filter, status: "active" }).select("price").lean(),
    MarketplaceTrade.find(filter).select("price").lean(),
    MarketplaceTrade.findOne(filter).select("price timestamp").sort({ timestamp: -1 }).lean(),
    MarketplaceActivity.countDocuments(filter),
    input.collectionId
      ? NFTItem.distinct("ownerWallet", { collectionId: objectId(input.collectionId), ownerWallet: { $type: "string" } })
      : input.nftContract
        ? NFTItem.distinct("ownerWallet", { ...(input.chainId ? { chainId: input.chainId } : {}), contractAddress: input.nftContract.toLowerCase(), ownerWallet: { $type: "string" } })
        : Promise.resolve([]),
    input.collectionId
      ? NFTItem.countDocuments({ collectionId: objectId(input.collectionId) })
      : input.nftContract
        ? NFTItem.countDocuments({ ...(input.chainId ? { chainId: input.chainId } : {}), contractAddress: input.nftContract.toLowerCase() })
        : Promise.resolve(0)
  ]);
  const prices = activeListings.map((listing) => BigInt(listing.price));
  const floorPrice = prices.length ? prices.reduce((min, price) => price < min ? price : min, prices[0]).toString() : null;

  return {
    floorPrice,
    totalVolume: sumWei(trades.map((trade) => trade.price)),
    totalSales: trades.length,
    activeListings: activeListings.length,
    ownersCount: owners.length || null,
    itemsCount,
    lastSalePrice: lastSale?.price ?? null,
    lastSaleAt: lastSale?.timestamp?.toISOString?.() ?? null,
    hasActivity: activityCount > 0
  };
}

export async function getTopCollections(input: { chainId?: number; limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 24);
  const match = {
    ...(input.chainId ? { chainId: input.chainId } : {}),
    collectionId: { $exists: true, $ne: null }
  };
  const grouped = await MarketplaceTrade.aggregate([
    { $match: match },
    { $group: { _id: "$collectionId", chainId: { $first: "$chainId" }, totalSales: { $sum: 1 }, prices: { $push: "$price" } } },
    { $limit: limit * 3 }
  ]);

  const collectionIds = grouped.map((entry) => entry._id).filter(Boolean) as IdLike[];
  const collections = collectionIds.length
    ? await NFTCollection.find({ _id: { $in: collectionIds } }).select("name slug contractAddress chainId coverImageUrl owner creatorId isVerifiedCollection collectionBadge").lean()
    : [];
  const creatorIds = [...new Set(collections.map((collection) => String(collection.creatorId ?? collection.owner)).filter(Boolean))];
  const creators = creatorIds.length
    ? await User.find({ _id: { $in: creatorIds } }).select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge").lean()
    : [];
  const creatorById = new Map(creators.map((creator) => [String(creator._id), creator]));
  const collectionById = new Map(collections.map((collection) => [String(collection._id), collection]));

  const activeListings = await MarketplaceListing.find({
    ...(input.chainId ? { chainId: input.chainId } : {}),
    status: "active",
    collectionId: { $in: collectionIds }
  }).select("collectionId price").lean();
  const listingsByCollection = new Map<string, typeof activeListings>();
  for (const listing of activeListings) {
    const key = String(listing.collectionId);
    listingsByCollection.set(key, [...(listingsByCollection.get(key) ?? []), listing]);
  }

  const rows = grouped.map((entry) => {
    const collection = entry._id ? collectionById.get(String(entry._id)) : undefined;
    const creator = collection ? creatorById.get(String(collection.creatorId ?? collection.owner)) : undefined;
    const listings = entry._id ? listingsByCollection.get(String(entry._id)) ?? [] : [];
    const listingPrices = listings.map((listing) => BigInt(listing.price));
    const floorPrice = listingPrices.length ? listingPrices.reduce((min, price) => price < min ? price : min, listingPrices[0]).toString() : null;
    return {
      collectionId: entry._id ? String(entry._id) : undefined,
      name: collection?.name,
      slug: collection?.slug,
      contractAddress: collection?.contractAddress,
      chainId: collection?.chainId ?? entry.chainId,
      floorPrice,
      totalVolume: sumWei(entry.prices),
      totalSales: entry.totalSales,
      activeListings: listings.length,
      coverImageUrl: collection?.coverImageUrl,
      ...(collection ? buildCollectionBadgeState(collection, creator) : {})
    };
  });

  return rows
    .sort((a, b) => (BigInt(b.totalVolume) > BigInt(a.totalVolume) ? 1 : BigInt(b.totalVolume) < BigInt(a.totalVolume) ? -1 : 0))
    .slice(0, limit);
}

export async function getRecentMarketplaceActivity(input: { chainId?: number; collectionId?: string; wallet?: string; limit?: number } = {}) {
  const filter: Record<string, unknown> = {};
  if (input.chainId) filter.chainId = input.chainId;
  if (input.collectionId) filter.collectionId = objectId(input.collectionId);
  if (input.wallet) filter.wallet = input.wallet.toLowerCase();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const rows = await MarketplaceActivity.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("nftItemId", "name tokenNumber imageUrl imageIpfsUri")
    .lean();
  return Promise.all(rows.map(async (row) => ({
    ...row,
    asset: await resolveMarketplaceAsset({ chainId: row.chainId, contractAddress: row.nftContract, tokenId: row.tokenId })
  })));
}
