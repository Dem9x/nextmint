//apps/api/src/models/Generation.ts
import { Schema, model, Types } from "mongoose";

const generationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    collection: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    provider: { type: String, enum: ["replicate", "openrouter", "huggingface", "flux", "comfyui", "local-template-fallback"], default: "replicate" },
    textProvider: { type: String, enum: ["openrouter", "local-template-fallback"], default: "openrouter" },
    imageProvider: { type: String, enum: ["replicate", "huggingface", "flux", "comfyui"], default: "replicate" },
    status: {
      type: String,
      enum: [
        "pending",
        "queued",
        "enhancing_prompt",
        "generating_image",
        "retrying_image",
        "image_ready",
        "uploading_image_ipfs",
        "generating_metadata",
        "uploading_metadata_ipfs",
        "ready_to_mint",
        "minting",
        "minted",
        "failed",
        "cancelled"
      ],
      default: "pending",
      index: true
    },
    prompt: { type: String, required: true },
    enhancedPrompt: String,
    negativePrompt: String,
    metadataDescription: String,
    imageUrl: String,
    imageIpfsUri: String,
    metadataIpfsUri: String,
    nftItem: { type: Types.ObjectId, ref: "NFTItem", index: true },
    model: String,
    usedFallback: { type: Boolean, default: false },
    style: String,
    artDirection: String,
    collectionSize: { type: Number, required: true, min: 1, max: 10000 },
    rarityLevel: { type: String, default: "balanced" },
    seed: Number,
    lora: String,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    output: Schema.Types.Mixed,
    error: String
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

generationSchema.index({ user: 1, createdAt: -1 });
generationSchema.index({ status: 1, updatedAt: -1 });

export const Generation = model("Generation", generationSchema);
