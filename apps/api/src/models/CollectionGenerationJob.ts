import { Schema, model, Types } from "mongoose";

const collectionGenerationJobSchema = new Schema(
  {
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    creatorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    supply: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["queued", "running", "paused", "completed", "failed", "cancelled"], default: "queued", index: true },
    stage: {
      type: String,
      enum: ["create_traits", "generate_prompts", "generate_images", "upload_images_ipfs", "create_metadata", "upload_metadata_ipfs", "calculate_rarity", "complete"],
      default: "create_traits",
      index: true
    },
    progressCurrent: { type: Number, default: 0, min: 0 },
    progressTotal: { type: Number, required: true, min: 1 },
    failedCount: { type: Number, default: 0, min: 0 },
    retryCount: { type: Number, default: 0, min: 0 },
    startedAt: Date,
    completedAt: Date,
    errorMessage: String
  },
  { timestamps: true }
);

collectionGenerationJobSchema.index({ collectionId: 1, createdAt: -1 });
collectionGenerationJobSchema.index({ status: 1, stage: 1 });

export const CollectionGenerationJob = model("CollectionGenerationJob", collectionGenerationJobSchema);
