import { Schema, model } from "mongoose";

const aiModelSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    provider: { type: String, enum: ["replicate", "openrouter", "huggingface", "flux", "comfyui"], required: true, index: true },
    modelId: { type: String, required: true },
    capabilities: [{ type: String, enum: ["text", "image", "image_to_image", "upscale", "prompt_enhancement", "metadata", "traits"] }],
    supportsLora: { type: Boolean, default: false },
    supportsUpscale: { type: Boolean, default: false },
    supportsReferenceImage: { type: Boolean, default: false },
    supportsNegativePrompt: { type: Boolean, default: false },
    supportsSeed: { type: Boolean, default: false },
    isFreeTier: { type: Boolean, default: false, index: true },
    maxWidth: Number,
    maxHeight: Number,
    maxBatchSize: { type: Number, default: 4 },
    creditCost: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    defaultParams: Schema.Types.Mixed,
    config: Schema.Types.Mixed
  },
  { timestamps: true }
);

export const AIModel = model("AIModel", aiModelSchema);

export async function seedDefaultAIModels() {
  await AIModel.bulkWrite(
    [
      {
        updateOne: {
          filter: { modelId: "openrouter/free" },
          update: {
            $setOnInsert: {
              name: "OpenRouter Free",
              provider: "openrouter",
              modelId: "openrouter/free",
              capabilities: ["text", "prompt_enhancement", "metadata", "traits"],
              isFreeTier: true,
              isActive: true
            }
          },
          upsert: true
        }
      },
      {
        updateOne: {
          filter: { modelId: "black-forest-labs/flux-schnell" },
          update: {
            $setOnInsert: {
              name: "Replicate FLUX Schnell",
              provider: "replicate",
              modelId: "black-forest-labs/flux-schnell",
              capabilities: ["image"],
              isFreeTier: true,
              maxWidth: 1024,
              maxHeight: 1024,
              supportsSeed: true,
              isActive: true
            }
          },
          upsert: true
        }
      },
      {
        updateOne: {
          filter: { modelId: "stability-ai/sdxl" },
          update: {
            $setOnInsert: {
              name: "Replicate SDXL",
              provider: "replicate",
              modelId: "stability-ai/sdxl",
              capabilities: ["image", "image_to_image"],
              maxWidth: 1024,
              maxHeight: 1024,
              supportsReferenceImage: true,
              supportsNegativePrompt: true,
              supportsSeed: true,
              isActive: true
            }
          },
          upsert: true
        }
      }
    ],
    { ordered: false }
  );
}
