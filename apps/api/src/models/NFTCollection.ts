import { Schema, model, Types } from "mongoose";

const nftCollectionSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    creatorId: { type: Types.ObjectId, ref: "User", index: true },
    creatorWallet: { type: String, lowercase: true },
    payoutWallet: { type: String, lowercase: true },
    name: { type: String, required: true, trim: true, index: "text" },
    slug: { type: String, required: true, unique: true, lowercase: true },
    symbol: { type: String, required: true, uppercase: true },
    description: String,
    status: {
      type: String,
      enum: [
        "draft",
        "generating_traits",
        "generating_prompts",
        "generating_images",
        "uploading_images",
        "generating_metadata",
        "uploading_metadata",
        "generating_assets",
        "assets_ready",
        "metadata_ready",
        "contract_pending",
        "contract_deployed",
        "publish_fee_pending",
        "published",
        "minting_live",
        "minting_ended",
        "sold_out",
        "paused",
        "failed",
        "cancelled"
      ],
      default: "draft",
      index: true
    },
    mode: { type: String, enum: ["single", "collection"], default: "collection", index: true },
    chainId: { type: Number, index: true },
    chainSlug: { type: String, index: true },
    contractAddress: { type: String, lowercase: true, index: true, sparse: true },
    factoryAddress: { type: String, lowercase: true },
    deploymentTxHash: { type: String, lowercase: true },
    publishFeeTxHash: { type: String, lowercase: true },
    publishFeePaymentId: String,
    publishFeeAmountToken: String,
    publishFeeAmountUsd: Number,
    publishFeeStatus: { type: String, enum: ["unpaid", "pending", "verified", "failed"], default: "unpaid", index: true },
    explorerUrl: String,
    deploymentStatus: {
      type: String,
      enum: ["not_started", "queued", "deploying", "deployed", "failed"],
      default: "not_started",
      index: true
    },
    maxSupply: { type: Number, required: true, min: 1, index: true },
    totalGenerated: { type: Number, default: 0, min: 0, index: true },
    totalUploaded: { type: Number, default: 0, min: 0, index: true },
    totalMinted: { type: Number, default: 0, min: 0, index: true },
    reservedSupply: { type: Number, default: 0, min: 0 },
    publicSupply: { type: Number, default: 0, min: 0 },
    maxMintPerWallet: { type: Number, default: 1, min: 1 },
    mintedSupply: { type: Number, default: 0, min: 0 },
    mintPrice: { type: String, default: "0" },
    mintCurrency: { type: String, default: "ETH" },
    mintToken: { type: String, default: "ETH" },
    royaltyBps: { type: Number, default: 500, min: 0, max: 1000 },
    platformMintFeeBps: { type: Number, default: 250, min: 0, max: 1000 },
    baseImageUri: String,
    imageBaseIpfsUri: String,
    baseMetadataUri: String,
    metadataBaseUri: String,
    metadataBaseIpfsUri: String,
    basePrompt: String,
    style: String,
    generationImageWidth: Number,
    generationImageHeight: Number,
    placeholderUri: String,
    unrevealedUri: String,
    coverImageUrl: String,
    coverImageIpfsUri: String,
    profileImageUrl: String,
    profileImageIpfsUri: String,
    bannerImageUrl: String,
    bannerImageIpfsUri: String,
    websiteUrl: String,
    twitterUrl: String,
    discordUrl: String,
    telegramUrl: String,
    externalUrl: String,
    creatorDisplayName: { type: String, trim: true },
    creatorBio: String,
    creatorAvatarUrl: String,
    isVerifiedCollection: { type: Boolean, default: false, index: true },
    verifiedCollectionAt: Date,
    verifiedCollectionReason: String,
    collectionBadge: { type: String, enum: ["none", "verified", "featured", "partner"], default: "none", index: true },
    revealMode: { type: String, enum: ["instant", "delayed", "placeholder"], default: "instant" },
    isRevealed: { type: Boolean, default: false },
    isPublicMintEnabled: { type: Boolean, default: false, index: true },
    isPaused: { type: Boolean, default: false, index: true },
    publicMintStartAt: Date,
    publicMintEndAt: Date,
    launchAt: Date,
    publishedAt: Date,
    revealAt: Date,
    analytics: {
      revenueNative: { type: String, default: "0" },
      uniqueMinters: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    },
    likeCount: { type: Number, default: 0, min: 0, index: true },
    viewCount: { type: Number, default: 0, min: 0, index: true },
    trendingScore: { type: Number, default: 0, index: true },
    lastTrendingCalculatedAt: Date
  },
  { timestamps: true }
);

nftCollectionSchema.index({ owner: 1, createdAt: -1 });
nftCollectionSchema.index({ creatorId: 1, createdAt: -1 });
nftCollectionSchema.index({ status: 1, launchAt: 1 });
nftCollectionSchema.index({ status: 1, publicMintStartAt: 1 });
nftCollectionSchema.index(
  { chainId: 1, contractAddress: 1 },
  { unique: true, partialFilterExpression: { contractAddress: { $type: "string" } } }
);
nftCollectionSchema.index({ owner: 1, chainId: 1 });
nftCollectionSchema.index({ deploymentStatus: 1, chainId: 1 });
nftCollectionSchema.index({ chainId: 1, status: 1 });
nftCollectionSchema.index({ trendingScore: -1, updatedAt: -1 });
nftCollectionSchema.index({ viewCount: -1 });
nftCollectionSchema.index({ likeCount: -1 });

export const NFTCollection = model("NFTCollection", nftCollectionSchema);
