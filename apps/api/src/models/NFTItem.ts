import { Schema, model, Types } from "mongoose";

const nftItemSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    owner: { type: Types.ObjectId, ref: "User", index: true },
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    collection: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    generationId: { type: Types.ObjectId, ref: "Generation", index: true },
    tokenNumber: { type: Number, min: 1, index: true },
    chainId: { type: Number, index: true },
    contractAddress: { type: String, lowercase: true, index: true, sparse: true },
    tokenId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String,
    imageIpfsUri: String,
    metadataIpfsUri: String,
    metadataGatewayUrl: String,
    attributes: { type: [Schema.Types.Mixed], default: [] },
    rarity: Schema.Types.Mixed,
    traits: { type: [Schema.Types.Mixed], default: [] },
    rarityTier: { type: String, index: true },
    metadata: Schema.Types.Mixed,
    traitHash: { type: String, index: true },
    rarityScore: { type: Number, default: 0, index: true },
    rarityRank: { type: Number, index: true },
    generationPrompt: String,
    negativePrompt: String,
    generationProvider: String,
    generationStatus: {
      type: String,
      enum: ["pending", "prompt_ready", "image_generated", "image_uploaded", "metadata_ready", "failed"],
      index: true
    },
    errorMessage: String,
    minted: { type: Boolean, default: false, index: true },
    mintTxHash: { type: String, lowercase: true, index: true, sparse: true },
    mintStatus: {
      type: String,
      enum: ["draft", "ipfs_ready", "ready_to_mint", "minting", "minted", "failed"],
      default: "draft",
      index: true
    },
    ownerWallet: { type: String, lowercase: true, index: true }
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

nftItemSchema.index({ userId: 1, createdAt: -1 });
nftItemSchema.index({ chainId: 1, contractAddress: 1, tokenId: 1 }, { unique: true, sparse: true });
nftItemSchema.index({ generationId: 1 });
nftItemSchema.index({ mintStatus: 1 });
nftItemSchema.index({ collectionId: 1, tokenNumber: 1 }, { unique: true, partialFilterExpression: { tokenNumber: { $type: "number" } } });
nftItemSchema.index({ collectionId: 1, traitHash: 1 }, { unique: true, partialFilterExpression: { traitHash: { $type: "string" } } });
nftItemSchema.index({ collectionId: 1, rarityRank: 1 });
nftItemSchema.index({ collectionId: 1, generationStatus: 1 });

export const NFTItem = model("NFTItem", nftItemSchema);
