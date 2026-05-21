import { Router } from "express";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { NFTCollection } from "../models/NFTCollection.js";
import { MintCampaign } from "../models/MintCampaign.js";
import { NFTItem } from "../models/NFTItem.js";
import { CollectionGenerationJob } from "../models/CollectionGenerationJob.js";
import { CreditLedger } from "../models/CreditLedger.js";
import { assertSupportedChain } from "../config/chains.config.js";
import { createCryptoPayment, verifyCryptoPayment } from "../services/crypto/payment.service.js";
import { deployLaunchpadCollection } from "../services/launchpad/collection-deploy.service.js";
import { getPlatformSettings } from "../services/platform-settings.service.js";
import { getActiveUserPlan } from "../services/subscription.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { collectionGenerationQueue } from "../queues/collection-generation.queue.js";

export const collectionRouter = Router();

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
  publicMintEndAt: z.string().datetime().optional(),
  metadataBaseUri: z.string().optional(),
  placeholderUri: z.string().optional(),
  coverImageUrl: z.string().optional(),
  payoutWallet: z.string().optional()
});

const collectionGenerateSchema = collectionSchema.omit({ maxSupply: true }).extend({
  basePrompt: z.string().trim().min(3).max(1000),
  supply: z.number().int().min(1).max(10000),
  style: z.string().trim().max(200).optional()
}).transform((body) => ({ ...body, maxSupply: body.supply }));

function slugify(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
}

async function assertPlanAllowsLaunch(userId: string, maxSupply: number) {
  const activePlan = await getActiveUserPlan(userId);
  const limit = activePlan.limits.maxCollectionSize ?? 0;
  if (!activePlan.limits.launchEnabled || limit <= 0) {
    throw new AppError(402, `Your active plan is ${activePlan.plan}. Public launchpad collections require Starter, Pro, or Enterprise.`);
  }
  if (maxSupply > limit) throw new AppError(402, `Max supply for ${activePlan.plan} plan is ${limit}.`);
  return activePlan;
}

const createCollectionHandler = asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionSchema.parse(req.body);
  const chain = assertSupportedChain(body.chainId);
  const user = await import("../models/User.js").then(({ User }) => User.findById(req.user!.id).lean());
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
    status: body.metadataBaseUri ? "metadata_ready" : "draft",
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
    metadataBaseUri: body.metadataBaseUri,
    baseMetadataUri: body.metadataBaseUri,
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
  const query = z.object({ supply: z.coerce.number().int().min(1).max(10000), provider: z.string().optional() }).parse(req.query);
  const user = await import("../models/User.js").then(({ User }) => User.findById(req.user!.id).lean());
  const activePlan = await getActiveUserPlan(req.user!.id);
  const estimatedCredits = query.supply;
  const userCredits = user?.credits ?? 0;
  const maxSupplyAllowed = activePlan.limits.maxCollectionSize ?? 0;
  res.json({
    supply: query.supply,
    estimatedCredits,
    estimatedCostUsd: null,
    userCredits,
    activePlan: activePlan.plan,
    planSource: activePlan.source,
    maxSupplyAllowed,
    launchEnabled: activePlan.limits.launchEnabled,
    planAllowsSupply: activePlan.limits.launchEnabled && query.supply <= maxSupplyAllowed,
    canGenerate: userCredits >= estimatedCredits && activePlan.limits.launchEnabled && query.supply <= maxSupplyAllowed
  });
}));

collectionRouter.post("/generate", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionGenerateSchema.parse(req.body);
  await assertPlanAllowsLaunch(req.user!.id, body.supply);
  const user = await import("../models/User.js").then(({ User }) => User.findById(req.user!.id));
  if (!user) throw new AppError(404, "User not found");
  if ((user.credits ?? 0) < body.supply) throw new AppError(402, "Insufficient credits for collection generation");
  const chain = assertSupportedChain(body.chainId);
  const wallet = body.payoutWallet ?? user.primaryWallet ?? user.primaryWalletAddress;
  if (!wallet || !isAddress(wallet)) throw new AppError(400, "Creator wallet login is required before collection generation.");
  user.credits = (user.credits ?? 0) - body.supply;
  await user.save();
  await CreditLedger.create({
    userId: req.user!.id,
    type: "generation_spend",
    amount: -body.supply,
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
    imageBaseIpfsUri: collection.imageBaseIpfsUri
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

collectionRouter.patch("/:id/config", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = collectionSchema.partial().parse(req.body);
  if (body.maxSupply) await assertPlanAllowsLaunch(req.user!.id, body.maxSupply);
  const update: Record<string, unknown> = { ...body };
  if (body.publicMintStartAt) update.publicMintStartAt = new Date(body.publicMintStartAt);
  if (body.publicMintEndAt) update.publicMintEndAt = new Date(body.publicMintEndAt);
  if (body.metadataBaseUri) {
    update.baseMetadataUri = body.metadataBaseUri;
    update.status = "metadata_ready";
  }
  const collection = await NFTCollection.findOneAndUpdate({ _id: req.params.id, owner: req.user!.id }, update, { new: true });
  if (!collection) throw new AppError(404, "Collection not found");
  res.json({ collection });
}));

collectionRouter.post("/:id/deploy", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ chainId: z.number().int() }).parse(req.body);
  const collection = await NFTCollection.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!collection) throw new AppError(404, "Collection not found");
  await assertPlanAllowsLaunch(req.user!.id, collection.maxSupply);
  if (!collection.metadataBaseUri && !collection.baseMetadataUri) throw new AppError(400, "metadataBaseUri is required before deploy");
  if (!collection.payoutWallet || !isAddress(collection.payoutWallet)) throw new AppError(400, "Creator payout wallet is required");
  collection.status = "contract_pending";
  collection.deploymentStatus = "deploying";
  await collection.save();
  const chain = assertSupportedChain(body.chainId);
  const deployed = await deployLaunchpadCollection({
    chainId: body.chainId,
    name: collection.name,
    symbol: collection.symbol,
    maxSupply: collection.maxSupply,
    mintPrice: collection.mintPrice,
    maxMintPerWallet: collection.maxMintPerWallet,
    publicMintStartAt: collection.publicMintStartAt ?? undefined,
    publicMintEndAt: collection.publicMintEndAt ?? undefined,
    metadataBaseUri: collection.metadataBaseUri ?? collection.baseMetadataUri!,
    placeholderUri: collection.placeholderUri ?? collection.unrevealedUri ?? undefined,
    creatorWallet: getAddress(collection.creatorWallet ?? collection.payoutWallet) as `0x${string}`,
    payoutWallet: getAddress(collection.payoutWallet) as `0x${string}`,
    royaltyBps: collection.royaltyBps,
    platformFeeBps: collection.platformMintFeeBps
  });
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
  if (!collection.metadataBaseUri && !collection.baseMetadataUri) throw new AppError(400, "Metadata base URI required");
  if (collection.publishFeeStatus !== "verified") throw new AppError(400, "Verified publish fee required");
  const now = new Date();
  collection.status = collection.publicMintStartAt && collection.publicMintStartAt > now ? "published" : "minting_live";
  collection.isPublicMintEnabled = true;
  collection.launchAt = now;
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
  res.json({ collection });
}));
