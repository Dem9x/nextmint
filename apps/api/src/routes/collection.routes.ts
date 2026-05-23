import { Router } from "express";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { NFTCollection } from "../models/NFTCollection.js";
import { CollectionLike } from "../models/CollectionLike.js";
import { MintCampaign } from "../models/MintCampaign.js";
import { NFTItem } from "../models/NFTItem.js";
import { CollectionGenerationJob } from "../models/CollectionGenerationJob.js";
import { CreditLedger } from "../models/CreditLedger.js";
import { User } from "../models/User.js";
import { assertSupportedChain, getChainConfig } from "../config/chains.config.js";
import { createCryptoPayment, verifyCryptoPayment } from "../services/crypto/payment.service.js";
import { deployLaunchpadCollection } from "../services/launchpad/collection-deploy.service.js";
import { getPlatformSettings } from "../services/platform-settings.service.js";
import { getActiveUserPlan } from "../services/subscription.service.js";
import { getCollectionEstimatedCredits, normalizeImageSize } from "../services/billing/credit-cost.service.js";
import { assertCollectionMetadataReady, normalizeMetadataBaseUri, requireCollectionDeployable } from "../services/collection/collection-readiness.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { collectionGenerationQueue } from "../queues/collection-generation.queue.js";
import { refreshCollectionTrendingScore } from "../services/discovery/trending.service.js";
import { buildCollectionBadgeState } from "../services/creators/public-creator.service.js";

export const collectionRouter = Router();

const profileSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  profileImageUrl: z.string().trim().max(500).optional(),
  profileImageIpfsUri: z.string().trim().max(500).optional(),
  bannerImageUrl: z.string().trim().max(500).optional(),
  bannerImageIpfsUri: z.string().trim().max(500).optional(),
  websiteUrl: z.string().trim().max(500).optional(),
  twitterUrl: z.string().trim().max(500).optional(),
  discordUrl: z.string().trim().max(500).optional(),
  telegramUrl: z.string().trim().max(500).optional(),
  externalUrl: z.string().trim().max(500).optional(),
  creatorDisplayName: z.string().trim().max(80).optional(),
  creatorBio: z.string().trim().max(500).optional(),
  creatorAvatarUrl: z.string().trim().max(500).optional()
});

function validLink(value?: string) {
  if (!value) return true;
  return value.startsWith("ipfs://") || /^https?:\/\//i.test(value);
}

function walletFor(req: AuthRequest) {
  const wallet = req.user?.walletAddress?.toLowerCase();
  if (!wallet) throw new AppError(400, "Wallet authenticated account required");
  return wallet;
}

function isOwner(collection: { owner?: unknown; creatorId?: unknown }, req: AuthRequest) {
  return req.user?.role === "admin" || String(collection.owner) === req.user?.id || String(collection.creatorId) === req.user?.id;
}

const collectionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().min(2).max(12),
  description: z.string().trim().max(1000).optional(),
  maxSupply: z.number().int().min(1).max(10000),
  chainId: z.number().int(),
  mintPrice: z.string().default("0"),
  maxMintPerWallet: z.number().int().min(1).default(1),
  royaltyBps: z.number().int().min(0).max(1000).default(500),
  publicMintStartAt: z.string().datetime().optional(),
  publicMintEndAt: z.union([z.string().datetime(), z.literal("")]).optional(),
  metadataBaseUri: z.string().optional(),
  placeholderUri: z.string().optional(),
  revealMode: z.enum(["instant", "delayed", "placeholder"]).optional(),
  coverImageUrl: z.string().optional(),
  payoutWallet: z.string().optional()
});

const collectionGenerateSchema = collectionSchema.omit({ maxSupply: true }).extend({
  basePrompt: z.string().trim().min(3).max(1000),
  supply: z.number().int().min(1).max(10000),
  style: z.string().trim().max(200).optional(),
  width: z.number().int().min(256).max(1024).optional(),
  height: z.number().int().min(256).max(1024).optional()
}).transform((body) => ({ ...body, maxSupply: body.supply }));

function slugify(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
}

async function assertPlanAllowsLaunch(userId: string, maxSupply: number) {
  const activePlan = await getActiveUserPlan(userId);
  const limit = activePlan.limits.maxCollectionSize ?? 0;
  if (!activePlan.limits.launchEnabled || limit <= 0) {
    throw new AppError(402, "Launchpad publish requires Creator or Pro.");
  }
  if (maxSupply > limit) throw new AppError(402, `Max supply for ${activePlan.plan} plan is ${limit}.`);
  const included = activePlan.limits.includedLaunchpadPublishes;
  if (typeof included === "number") {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const used = await NFTCollection.countDocuments({ owner: userId, publishedAt: { $gte: monthStart } });
    if (used >= included) throw new AppError(402, `${activePlan.plan} plan includes ${included} launchpad publish(es) per month.`);
  }
  return activePlan;
}

async function buildCollectionGenerationQuote(input: { userId: string; supply: number; width?: number; height?: number; chainId?: number }) {
  const user = await User.findById(input.userId).lean();
  const activePlan = await getActiveUserPlan(input.userId);
  const imageSize = normalizeImageSize(input.width, input.height);
  const estimatedCredits = getCollectionEstimatedCredits({
    supply: input.supply,
    width: imageSize,
    height: imageSize,
    enhancePrompt: false,
    uploadToIpfs: true
  });
  const userCredits = Number(user?.credits ?? 0);
  const maxSupplyAllowed = Number(activePlan.limits.maxCollectionSize ?? 0);
  const maxImageSizeAllowed = Number(activePlan.limits.maxImageSize ?? 512);
  const chain = input.chainId ? getChainConfig(input.chainId) : undefined;
  const reasons: string[] = [];

  if (input.supply > maxSupplyAllowed) reasons.push(`Your plan supports collections up to ${maxSupplyAllowed} NFTs.`);
  if (imageSize > maxImageSizeAllowed) reasons.push(`Your plan supports image size up to ${maxImageSizeAllowed}px.`);
  if (userCredits < estimatedCredits) reasons.push(`Insufficient credits. Required: ${estimatedCredits}, available: ${userCredits}.`);
  if (activePlan.limits.testnetOnly && chain && !chain.isTestnet) reasons.push("Free plan is testnet only.");

  return {
    supply: input.supply,
    width: imageSize,
    height: imageSize,
    estimatedCredits,
    estimatedCostUsd: null,
    userCredits,
    activePlan: activePlan.plan,
    planSource: activePlan.source,
    maxSupplyAllowed,
    maxImageSizeAllowed,
    launchEnabled: activePlan.limits.launchEnabled,
    marketplaceListingEnabled: activePlan.limits.marketplaceListingEnabled,
    planAllowsSupply: input.supply <= maxSupplyAllowed,
    planAllowsImageSize: imageSize <= maxImageSizeAllowed,
    canGenerate: reasons.length === 0,
    reasons
  };
}

async function withPublicBadges(collection: any) {
  if (!collection) return collection;
  const creatorId = collection.creatorId ?? collection.owner;
  const creator = creatorId
    ? await User.findById(creatorId)
      .select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge")
      .lean()
    : undefined;
  return { ...collection, ...buildCollectionBadgeState(collection, creator) };
}

const createCollectionHandler = asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionSchema.parse(req.body);
  const chain = assertSupportedChain(body.chainId);
  const user = await User.findById(req.user!.id).lean();
  const wallet = body.payoutWallet ?? user?.primaryWallet ?? user?.primaryWalletAddress;
  if (!wallet || !isAddress(wallet)) throw new AppError(400, "Creator wallet login is required before collection launch.");
  const settings = await getPlatformSettings();
  const collection = await NFTCollection.create({
    owner: req.user!.id,
    creatorId: req.user!.id,
    creatorWallet: wallet.toLowerCase(),
    payoutWallet: wallet.toLowerCase(),
    name: body.name,
    slug: slugify(body.name),
    symbol: body.symbol.toUpperCase(),
    description: body.description,
    status: "draft",
    chainId: body.chainId,
    chainSlug: chain.slug,
    explorerUrl: chain.explorerUrl,
    maxSupply: body.maxSupply,
    publicSupply: body.maxSupply,
    maxMintPerWallet: body.maxMintPerWallet,
    mintPrice: body.mintPrice,
    mintCurrency: chain.nativeCurrency,
    mintToken: chain.nativeCurrency,
    royaltyBps: body.royaltyBps,
    platformMintFeeBps: settings.platformMintFeeBps ?? Math.round((settings.platformMintFeePercent ?? 2.5) * 100),
    metadataBaseUri: normalizeMetadataBaseUri(body.metadataBaseUri),
    baseMetadataUri: normalizeMetadataBaseUri(body.metadataBaseUri),
    placeholderUri: body.placeholderUri,
    unrevealedUri: body.placeholderUri,
    coverImageUrl: body.coverImageUrl,
    publicMintStartAt: body.publicMintStartAt ? new Date(body.publicMintStartAt) : new Date(),
    publicMintEndAt: body.publicMintEndAt ? new Date(body.publicMintEndAt) : undefined
  });
  res.status(201).json({ collectionId: String(collection._id), status: collection.status, collection });
});

collectionRouter.post("/", requireAuth, createCollectionHandler);
collectionRouter.post("/create", requireAuth, createCollectionHandler);

collectionRouter.get("/generation-quote", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const query = z.object({
    supply: z.coerce.number().int().min(1).max(10000),
    width: z.coerce.number().int().min(256).max(1024).optional(),
    height: z.coerce.number().int().min(256).max(1024).optional(),
    chainId: z.coerce.number().int().optional(),
    provider: z.string().optional()
  }).parse(req.query);
  res.json(await buildCollectionGenerationQuote({ userId: req.user!.id, supply: query.supply, width: query.width, height: query.height, chainId: query.chainId }));
}));

collectionRouter.post("/generate", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionGenerateSchema.parse(req.body);
  const quote = await buildCollectionGenerationQuote({ userId: req.user!.id, supply: body.supply, width: body.width, height: body.height, chainId: body.chainId });
  if (!quote.canGenerate) throw new AppError(402, quote.reasons[0] ?? "Collection generation is not available for your plan.");
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(404, "User not found");
  const chain = assertSupportedChain(body.chainId);
  const wallet = body.payoutWallet ?? user.primaryWallet ?? user.primaryWalletAddress;
  if (!wallet || !isAddress(wallet)) throw new AppError(400, "Creator wallet login is required before collection generation.");
  user.credits = Math.max((user.credits ?? 0) - quote.estimatedCredits, 0);
  await user.save();
  await CreditLedger.create({
    userId: req.user!.id,
    type: "generation_spend",
    amount: -quote.estimatedCredits,
    balanceAfter: user.credits,
    sourceId: undefined
  });
  const settings = await getPlatformSettings();
  const collection = await NFTCollection.create({
    owner: req.user!.id,
    creatorId: req.user!.id,
    creatorWallet: wallet.toLowerCase(),
    payoutWallet: wallet.toLowerCase(),
    name: body.name,
    slug: slugify(body.name),
    symbol: body.symbol.toUpperCase(),
    description: body.description,
    mode: "collection",
    status: "generating_traits",
    chainId: body.chainId,
    chainSlug: chain.slug,
    explorerUrl: chain.explorerUrl,
    maxSupply: body.supply,
    publicSupply: body.supply,
    mintPrice: body.mintPrice,
    maxMintPerWallet: body.maxMintPerWallet,
    mintCurrency: chain.nativeCurrency,
    mintToken: chain.nativeCurrency,
    royaltyBps: body.royaltyBps,
    platformMintFeeBps: settings.platformMintFeeBps ?? Math.round((settings.platformMintFeePercent ?? 2.5) * 100),
    basePrompt: body.basePrompt,
    style: body.style,
    generationImageWidth: quote.width,
    generationImageHeight: quote.height,
    publicMintStartAt: body.publicMintStartAt ? new Date(body.publicMintStartAt) : new Date(),
    publicMintEndAt: body.publicMintEndAt ? new Date(body.publicMintEndAt) : undefined
  });
  const generationJob = await CollectionGenerationJob.create({
    collectionId: collection._id,
    creatorId: req.user!.id,
    supply: body.supply,
    status: "queued",
    stage: "create_traits",
    progressTotal: body.supply
  });
  await collectionGenerationQueue.add("generate", { collectionId: String(collection._id), jobId: String(generationJob._id) });
  res.status(201).json({ collectionId: String(collection._id), jobId: String(generationJob._id), status: collection.status });
}));

collectionRouter.get("/:id/generation-status", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id }).lean();
  if (!collection) throw new AppError(404, "Collection not found");
  const job = await CollectionGenerationJob.findOne({ collectionId: collection._id }).sort({ createdAt: -1 }).lean();
  res.json({
    collectionId: String(collection._id),
    status: collection.status,
    stage: job?.stage ?? "complete",
    progressCurrent: job?.progressCurrent ?? collection.totalGenerated ?? 0,
    progressTotal: job?.progressTotal ?? collection.maxSupply,
    failedCount: job?.failedCount ?? 0,
    retryable: Boolean(job && ["failed", "paused"].includes(job.status)),
    errorMessage: job?.errorMessage,
    jobStatus: job?.status,
    metadataBaseIpfsUri: collection.metadataBaseIpfsUri ?? collection.metadataBaseUri,
    imageBaseIpfsUri: collection.imageBaseIpfsUri,
    readiness: await assertCollectionMetadataReady(collection._id)
  });
}));

collectionRouter.get("/:id/items", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.string().optional()
  }).parse(req.query);
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id }).lean();
  if (!collection) throw new AppError(404, "Collection not found");
  const filter: Record<string, unknown> = { collectionId: collection._id };
  if (query.status) filter.generationStatus = query.status;
  const [items, total] = await Promise.all([
    NFTItem.find(filter).sort({ tokenNumber: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    NFTItem.countDocuments(filter)
  ]);
  res.json({ items, total, page: query.page, limit: query.limit });
}));

collectionRouter.post("/:id/cancel-generation", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOneAndUpdate({ _id: req.params.id, owner: req.user!.id }, { status: "cancelled" }, { new: true });
  if (!collection) throw new AppError(404, "Collection not found");
  await CollectionGenerationJob.findOneAndUpdate({ collectionId: collection._id }, { status: "cancelled" }, { sort: { createdAt: -1 } });
  res.json({ collection });
}));

collectionRouter.post("/:id/pause-generation", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  await CollectionGenerationJob.findOneAndUpdate({ collectionId: collection._id }, { status: "paused" }, { sort: { createdAt: -1 } });
  res.json({ status: "paused" });
}));

collectionRouter.post("/:id/resume-generation", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  const job = await CollectionGenerationJob.findOneAndUpdate({ collectionId: collection._id }, { status: "queued" }, { sort: { createdAt: -1 }, new: true });
  if (!job) throw new AppError(404, "Generation job not found");
  await collectionGenerationQueue.add("generate", { collectionId: String(collection._id), jobId: String(job._id) });
  res.json({ status: "queued" });
}));

collectionRouter.post("/:id/retry-failed", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  const failed = await NFTItem.countDocuments({ collectionId: collection._id, generationStatus: "failed" });
  if (!failed) return res.json({ status: "nothing_to_retry", failedCount: 0 });
  await NFTItem.updateMany({ collectionId: collection._id, generationStatus: "failed" }, { generationStatus: "pending", errorMessage: undefined });
  collection.status = "generating_images";
  await collection.save();
  const generationJob = await CollectionGenerationJob.create({
    collectionId: collection._id,
    creatorId: req.user!.id,
    supply: collection.maxSupply,
    status: "queued",
    stage: "generate_images",
    progressCurrent: collection.totalGenerated ?? 0,
    progressTotal: collection.maxSupply,
    retryCount: 1
  });
  await collectionGenerationQueue.add("generate", { collectionId: String(collection._id), jobId: String(generationJob._id) });
  res.json({ status: "queued", jobId: String(generationJob._id), failedCount: failed });
}));

collectionRouter.get("/:collectionId/profile", asyncHandler(async (req, res) => {
  const collection = await NFTCollection.findById(req.params.collectionId)
    .select("name slug description chainId contractAddress owner creatorId creatorWallet creatorDisplayName creatorBio creatorAvatarUrl profileImageUrl profileImageIpfsUri bannerImageUrl bannerImageIpfsUri coverImageUrl websiteUrl twitterUrl discordUrl telegramUrl externalUrl likeCount viewCount trendingScore isVerifiedCollection collectionBadge")
    .lean();
  if (!collection) throw new AppError(404, "Collection not found");
  res.json({ profile: await withPublicBadges(collection) });
}));

collectionRouter.patch("/:collectionId/profile", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = profileSchema.parse(req.body);
  const collection = await NFTCollection.findById(req.params.collectionId);
  if (!collection) throw new AppError(404, "Collection not found");
  if (!isOwner(collection, req)) throw new AppError(403, "Only collection owner, creator, or admin can update profile");
  for (const [key, value] of Object.entries(body)) {
    if (key.toLowerCase().includes("url") || key.toLowerCase().includes("uri")) {
      if (!validLink(value)) throw new AppError(400, `${key} must be http(s) or ipfs://`);
    }
  }
  Object.assign(collection, body);
  await collection.save();
  res.json({ profile: collection });
}));

collectionRouter.post("/:collectionId/like", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const collection = await NFTCollection.findById(req.params.collectionId);
  if (!collection) throw new AppError(404, "Collection not found");
  try {
    await CollectionLike.create({ userId: req.user!.id, wallet, collectionId: collection._id });
    collection.likeCount = (collection.likeCount ?? 0) + 1;
    await collection.save();
    await refreshCollectionTrendingScore(String(collection._id));
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
  }
  const latest = await NFTCollection.findById(collection._id).select("likeCount").lean();
  res.json({ liked: true, likeCount: latest?.likeCount ?? collection.likeCount ?? 0 });
}));

collectionRouter.delete("/:collectionId/like", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const collection = await NFTCollection.findById(req.params.collectionId);
  if (!collection) throw new AppError(404, "Collection not found");
  const deleted = await CollectionLike.findOneAndDelete({ collectionId: collection._id, wallet });
  if (deleted) {
    collection.likeCount = Math.max((collection.likeCount ?? 0) - 1, 0);
    await collection.save();
    await refreshCollectionTrendingScore(String(collection._id));
  }
  res.json({ liked: false, likeCount: collection.likeCount ?? 0 });
}));

collectionRouter.get("/:collectionId/like-status", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const collection = await NFTCollection.findById(req.params.collectionId).select("likeCount").lean();
  if (!collection) throw new AppError(404, "Collection not found");
  const liked = await CollectionLike.exists({ collectionId: collection._id, wallet });
  res.json({ liked: Boolean(liked), likeCount: collection.likeCount ?? 0 });
}));

collectionRouter.post("/:collectionId/view", asyncHandler(async (req, res) => {
  const collection = await NFTCollection.findByIdAndUpdate(req.params.collectionId, { $inc: { viewCount: 1 } }, { new: true }).select("viewCount");
  if (!collection) throw new AppError(404, "Collection not found");
  void refreshCollectionTrendingScore(String(collection._id)).catch(() => undefined);
  res.json({ viewCount: collection.viewCount ?? 0 });
}));

collectionRouter.patch("/:id/config", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionSchema.partial().parse(req.body);
  if (body.maxSupply) await assertPlanAllowsLaunch(req.user!.id, body.maxSupply);
  const existing = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!existing) throw new AppError(404, "Collection not found");
  if (body.maxSupply !== undefined && body.maxSupply !== existing.maxSupply) {
    const generatedItems = await NFTItem.countDocuments({ collectionId: existing._id });
    if (generatedItems > 0) {
      throw new AppError(400, `Max supply cannot be changed after collection assets have been generated. This collection already has ${generatedItems} generated item(s).`);
    }
  }
  const locked = Boolean(existing.contractAddress) || ["contract_pending", "contract_deployed", "publish_fee_pending", "published", "minting_live", "sold_out"].includes(existing.status);
  if (locked) {
    const lockedFields = ["name", "symbol", "maxSupply", "chainId", "metadataBaseUri", "revealMode"] as const;
    const changedLockedField = lockedFields.find((field) => body[field] !== undefined);
    if (changedLockedField) throw new AppError(400, `${changedLockedField} cannot be changed after contract deployment starts.`);
  }
  const update: Record<string, unknown> = { ...body };
  if (body.publicMintStartAt) update.publicMintStartAt = new Date(body.publicMintStartAt);
  if (body.publicMintEndAt) update.publicMintEndAt = new Date(body.publicMintEndAt);
  if (body.publicMintEndAt === "") update.publicMintEndAt = undefined;
  if (body.metadataBaseUri) {
    const normalized = normalizeMetadataBaseUri(body.metadataBaseUri);
    update.metadataBaseUri = normalized;
    update.baseMetadataUri = normalized;
    update.metadataBaseIpfsUri = normalized;
  }
  if (body.placeholderUri !== undefined) update.unrevealedUri = body.placeholderUri;
  if (body.payoutWallet && !isAddress(body.payoutWallet)) throw new AppError(400, "Invalid payout wallet");
  const collection = await NFTCollection.findOneAndUpdate({ _id: req.params.id, owner: req.user!.id }, update, { new: true });
  res.json({ collection });
}));

collectionRouter.post("/:id/deploy", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ chainId: z.number().int() }).parse(req.body);
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  await assertPlanAllowsLaunch(req.user!.id, collection.maxSupply);
  if (collection.chainId && collection.chainId !== body.chainId) throw new AppError(400, "Deploy chain must match collection chain");
  if (!collection.publicMintStartAt) throw new AppError(400, "Public mint start time is required before deploy");
  if (collection.publicMintEndAt && collection.publicMintEndAt <= collection.publicMintStartAt) throw new AppError(400, "Public mint end time must be after start time");
  const readiness = await requireCollectionDeployable(collection._id);
  if (!collection.payoutWallet || !isAddress(collection.payoutWallet)) throw new AppError(400, "Creator payout wallet is required");
  collection.status = "contract_pending";
  collection.deploymentStatus = "deploying";
  await collection.save();
  const chain = assertSupportedChain(body.chainId);
  let deployed: Awaited<ReturnType<typeof deployLaunchpadCollection>>;
  try {
    deployed = await deployLaunchpadCollection({
      chainId: body.chainId,
      name: collection.name,
      symbol: collection.symbol,
      maxSupply: collection.maxSupply,
      mintPrice: collection.mintPrice,
      maxMintPerWallet: collection.maxMintPerWallet,
      publicMintStartAt: collection.publicMintStartAt ?? undefined,
      publicMintEndAt: collection.publicMintEndAt ?? undefined,
      metadataBaseUri: readiness.metadataBaseUri!,
      placeholderUri: collection.placeholderUri ?? collection.unrevealedUri ?? undefined,
      creatorWallet: getAddress(collection.creatorWallet ?? collection.payoutWallet) as `0x${string}`,
      payoutWallet: getAddress(collection.payoutWallet) as `0x${string}`,
      royaltyBps: collection.royaltyBps,
      platformFeeBps: collection.platformMintFeeBps
    });
  } catch (error) {
    collection.status = "metadata_ready";
    collection.deploymentStatus = "failed";
    await collection.save();
    throw error;
  }
  collection.chainId = body.chainId;
  collection.chainSlug = chain.slug;
  collection.contractAddress = deployed.contractAddress.toLowerCase();
  collection.deploymentTxHash = deployed.txHash.toLowerCase();
  collection.deploymentStatus = "deployed";
  collection.status = "contract_deployed";
  collection.explorerUrl = chain.explorerUrl;
  await collection.save();
  res.json({ collection, deployment: deployed });
}));

collectionRouter.post("/:id/publish-quote", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ chainId: z.number().int(), token: z.enum(["NATIVE", "ETH"]).default("NATIVE") }).parse(req.body);
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  await assertPlanAllowsLaunch(req.user!.id, collection.maxSupply);
  if (!collection.contractAddress) throw new AppError(400, "Deploy collection contract before publishing");
  if (collection.deploymentStatus !== "deployed") throw new AppError(400, "Collection deployment must be confirmed before publish fee quote");
  const settings = await getPlatformSettings();
  const payment = await createCryptoPayment({
    userId: req.user!.id,
    walletAddress: collection.creatorWallet ?? req.user!.walletAddress!,
    chainId: body.chainId,
    token: body.token,
    purpose: "publish",
    usdAmount: settings.publishFeeUsd ?? settings.launchFeeUsd ?? 5,
    collectionId: String(collection._id)
  });
  collection.publishFeePaymentId = payment.payment.paymentId;
  collection.publishFeeStatus = "pending";
  collection.status = "publish_fee_pending";
  collection.publishFeeAmountToken = payment.payment.amountToken;
  collection.publishFeeAmountUsd = payment.payment.usdValueAtPayment;
  await collection.save();
  res.status(201).json(payment);
}));

collectionRouter.post("/:id/verify-publish-fee", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ paymentId: z.string(), chainId: z.number().int(), txHash: z.custom<`0x${string}`>() }).parse(req.body);
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  if (collection.publishFeePaymentId !== body.paymentId) throw new AppError(400, "Publish payment mismatch");
  const payment = await verifyCryptoPayment({ userId: req.user!.id, paymentId: body.paymentId, txHash: body.txHash, chainId: body.chainId });
  collection.publishFeeTxHash = body.txHash.toLowerCase();
  collection.publishFeeStatus = "verified";
  collection.publishFeeAmountToken = payment.amountToken;
  collection.publishFeeAmountUsd = payment.usdValueAtPayment;
  await collection.save();
  res.json({ collection });
}));

collectionRouter.post("/:id/publish", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  await assertPlanAllowsLaunch(req.user!.id, collection.maxSupply);
  if (!collection.contractAddress || !collection.chainId) throw new AppError(400, "Contract deployment required");
  if (collection.deploymentStatus !== "deployed") throw new AppError(400, "Collection deployment must be confirmed before publishing");
  const readiness = await assertCollectionMetadataReady(collection._id);
  if (!readiness.deployable) throw new AppError(400, `Collection metadata is not publishable: ${readiness.reason}`);
  if (collection.publishFeeStatus !== "verified") throw new AppError(400, "Verified publish fee required");
  if (!["contract_deployed", "publish_fee_pending"].includes(collection.status)) {
    throw new AppError(400, `Collection cannot be published from status ${collection.status}`);
  }
  if (!collection.publicMintStartAt) throw new AppError(400, "Public mint start time is required");
  if (collection.publicMintEndAt && collection.publicMintEndAt <= collection.publicMintStartAt) throw new AppError(400, "Public mint end time must be after start time");
  const now = new Date();
  collection.status = collection.publicMintStartAt && collection.publicMintStartAt > now ? "published" : "minting_live";
  collection.isPublicMintEnabled = true;
  collection.launchAt = now;
  collection.publishedAt = now;
  await collection.save();
  await MintCampaign.findOneAndUpdate(
    { collectionId: collection._id },
    {
      collectionId: collection._id,
      chainId: collection.chainId,
      contractAddress: collection.contractAddress,
      status: collection.status === "minting_live" ? "live" : "scheduled",
      startAt: collection.publicMintStartAt,
      endAt: collection.publicMintEndAt,
      mintPrice: collection.mintPrice,
      maxSupply: collection.maxSupply,
      totalMinted: collection.totalMinted,
      maxMintPerWallet: collection.maxMintPerWallet,
      publicMintEnabled: true
    },
    { upsert: true, new: true }
  );
  res.json({ collection, publicUrl: `/launchpad/${collection.slug}` });
}));

collectionRouter.get("/:id", asyncHandler(async (req, res) => {
  const collection = await NFTCollection.findById(req.params.id).lean();
  if (!collection) throw new AppError(404, "Collection not found");
  const readiness = await assertCollectionMetadataReady(collection._id);
  res.json({ collection: await withPublicBadges(collection), readiness });
}));
