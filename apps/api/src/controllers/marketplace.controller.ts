import { isAddress, type Hash } from "viem";
import { z } from "zod";
import { AppError } from "../middleware/error.js";
import { MarketplaceActivity } from "../models/MarketplaceActivity.js";
import { MarketplaceListing } from "../models/MarketplaceListing.js";
import { MarketplaceTrade } from "../models/MarketplaceTrade.js";
import { asyncHandler } from "../utils/async-handler.js";
import { verifyMarketplaceTx } from "../services/marketplace/marketplace-indexer.service.js";
import { resolveMarketplaceAsset } from "../services/marketplace/marketplace-asset-resolver.service.js";
import { getCollectionMarketplaceStats, getGlobalMarketplaceStats, getRecentMarketplaceActivity, getTopCollections } from "../services/marketplace/marketplace-stats.service.js";
import { getActiveUserPlan } from "../services/subscription.service.js";
import type { AuthRequest } from "../middleware/auth.js";

const listQuerySchema = z.object({
  chainId: z.coerce.number().int().optional(),
  collectionId: z.string().optional(),
  seller: z.string().optional(),
  status: z.enum(["active", "sold", "cancelled"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1)
});

export const getMarketplaceListings = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { status: query.status };
  if (query.chainId) filter.chainId = query.chainId;
  if (query.collectionId) filter.collectionId = query.collectionId;
  if (query.seller) {
    if (!isAddress(query.seller)) throw new AppError(400, "Invalid seller address");
    filter.seller = query.seller.toLowerCase();
  }
  const skip = (query.page - 1) * query.limit;
  const listings = await MarketplaceListing.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(query.limit)
    .populate("nftItemId", "name description imageUrl imageIpfsUri metadataIpfsUri likeCount viewCount")
    .populate("collectionId", "name slug description coverImageUrl contractAddress chainId")
    .lean();
  const listingsWithAssets = await Promise.all(listings.map(async (listing) => ({
    ...listing,
    asset: await resolveMarketplaceAsset({ chainId: listing.chainId, contractAddress: listing.nftContract, tokenId: listing.tokenId })
  })));
  res.json({ listings: listingsWithAssets, page: query.page, limit: query.limit });
});

export const getMarketplaceStats = asyncHandler(async (req, res) => {
  const query = z.object({ chainId: z.coerce.number().int().optional() }).parse(req.query);
  res.json(await getGlobalMarketplaceStats(query));
});

export const getTopMarketplaceCollections = asyncHandler(async (req, res) => {
  const query = z.object({
    chainId: z.coerce.number().int().optional(),
    limit: z.coerce.number().int().min(1).max(24).default(8)
  }).parse(req.query);
  res.json({ collections: await getTopCollections(query) });
});

export const getCollectionStats = asyncHandler(async (req, res) => {
  res.json(await getCollectionMarketplaceStats({ collectionId: req.params.collectionId }));
});

export const getContractStats = asyncHandler(async (req, res) => {
  const params = z.object({ chainId: z.coerce.number().int(), contractAddress: z.string() }).parse(req.params);
  if (!isAddress(params.contractAddress)) throw new AppError(400, "Invalid contract address");
  res.json(await getCollectionMarketplaceStats({ chainId: params.chainId, nftContract: params.contractAddress }));
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const query = z.object({
    chainId: z.coerce.number().int().optional(),
    collectionId: z.string().optional(),
    wallet: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }).parse(req.query);
  if (query.wallet && !isAddress(query.wallet)) throw new AppError(400, "Invalid wallet address");
  res.json({ activity: await getRecentMarketplaceActivity(query) });
});

export const getMarketplaceListing = asyncHandler(async (req, res) => {
  const params = z.object({ chainId: z.coerce.number().int(), contractAddress: z.string(), tokenId: z.string() }).parse(req.params);
  if (!isAddress(params.contractAddress)) throw new AppError(400, "Invalid contract address");
  const contractAddress = params.contractAddress.toLowerCase();
  const [listing, asset, stats, activity] = await Promise.all([
    MarketplaceListing.findOne({
    chainId: params.chainId,
      nftContract: contractAddress,
    tokenId: params.tokenId,
    status: "active"
  })
    .populate("nftItemId", "name description imageUrl imageIpfsUri metadataIpfsUri ownerWallet likeCount viewCount")
    .populate("collectionId", "name slug description coverImageUrl contractAddress chainId")
      .lean(),
    resolveMarketplaceAsset({ chainId: params.chainId, contractAddress, tokenId: params.tokenId }),
    getCollectionMarketplaceStats({ chainId: params.chainId, nftContract: contractAddress }),
    MarketplaceActivity.find({ chainId: params.chainId, nftContract: contractAddress, tokenId: params.tokenId }).sort({ timestamp: -1 }).limit(50).lean()
  ]);

  res.json({ listing, asset, stats, activity });
});

export const getMarketplaceActivity = asyncHandler(async (req, res) => {
  const query = z.object({
    chainId: z.coerce.number().int().optional(),
    contractAddress: z.string().optional(),
    tokenId: z.string().optional(),
    collectionId: z.string().optional(),
    wallet: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  }).parse(req.query);
  const filter: Record<string, unknown> = {};
  if (query.chainId) filter.chainId = query.chainId;
  if (query.contractAddress) {
    if (!isAddress(query.contractAddress)) throw new AppError(400, "Invalid contract address");
    filter.nftContract = query.contractAddress.toLowerCase();
  }
  if (query.tokenId) filter.tokenId = query.tokenId;
  if (query.collectionId) filter.collectionId = query.collectionId;
  if (query.wallet) {
    if (!isAddress(query.wallet)) throw new AppError(400, "Invalid wallet address");
    filter.wallet = query.wallet.toLowerCase();
  }
  const activity = await MarketplaceActivity.find(filter).sort({ timestamp: -1 }).limit(query.limit).lean();
  res.json({ activity });
});

export const getMarketplaceUser = asyncHandler(async (req, res) => {
  if (!isAddress(req.params.wallet)) throw new AppError(400, "Invalid wallet address");
  const wallet = req.params.wallet.toLowerCase();
  const [listings, trades, activity] = await Promise.all([
    MarketplaceListing.find({ seller: wallet }).sort({ createdAt: -1 }).limit(50).lean(),
    MarketplaceTrade.find({ $or: [{ seller: wallet }, { buyer: wallet }] }).sort({ timestamp: -1 }).limit(50).lean(),
    MarketplaceActivity.find({ wallet }).sort({ timestamp: -1 }).limit(50).lean()
  ]);
  res.json({ listings, trades, activity });
});

function verifyBody(event: "listed" | "sold" | "cancelled") {
  return z.object({ chainId: z.number().int(), txHash: z.custom<Hash>() }).transform((value) => ({ ...value, expectedEvent: event }));
}

export const verifyListing = asyncHandler(async (req: AuthRequest, res) => {
  const activePlan = await getActiveUserPlan(req.user!.id);
  if (!activePlan.limits.marketplaceListingEnabled) throw new AppError(402, "Marketplace listing requires Creator or Pro.");
  res.json(await verifyMarketplaceTx(verifyBody("listed").parse(req.body)));
});

export const verifySale = asyncHandler(async (req, res) => {
  res.json(await verifyMarketplaceTx(verifyBody("sold").parse(req.body)));
});

export const verifyCancel = asyncHandler(async (req, res) => {
  res.json(await verifyMarketplaceTx(verifyBody("cancelled").parse(req.body)));
});
