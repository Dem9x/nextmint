import Replicate from "replicate";
import { aiConfig } from "../../config/ai.config.js";
import type { ImageGenerationInput, ImageGenerationResult } from "../types/ai.types.js";
import { clampImageSize, normalizeReplicateImageUrl, withTimeout } from "../utils/image-utils.js";
import { ProviderConfigurationError, ProviderError, ProviderTimeoutError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "./base.provider.js";

type ReplicateInput = Record<string, string | number | undefined>;

function fluxAdapter(input: ImageGenerationInput): ReplicateInput {
  const size = clampImageSize(input.width, input.height);
  return {
    prompt: input.prompt,
    aspect_ratio: size.width === size.height ? "1:1" : `${size.width}:${size.height}`,
    output_format: "webp",
    seed: input.seed
  };
}

function sdxlAdapter(input: ImageGenerationInput): ReplicateInput {
  const size = clampImageSize(input.width, input.height);
  return {
    prompt: input.prompt,
    negative_prompt: input.negativePrompt,
    width: size.width,
    height: size.height,
    seed: input.seed,
    num_inference_steps: input.steps,
    guidance_scale: input.guidanceScale,
    image: input.referenceImageUrl
  };
}

function genericAdapter(input: ImageGenerationInput): ReplicateInput {
  const size = clampImageSize(input.width, input.height);
  return {
    prompt: input.prompt,
    negative_prompt: input.negativePrompt,
    width: size.width,
    height: size.height,
    seed: input.seed,
    image: input.referenceImageUrl
  };
}

export const replicateModelAdapters: Record<string, (input: ImageGenerationInput) => ReplicateInput> = {
  "black-forest-labs/flux-schnell": fluxAdapter,
  "stability-ai/sdxl": sdxlAdapter
};

function adapterFor(model: string) {
  const normalized = model.toLowerCase();
  if (replicateModelAdapters[model]) return replicateModelAdapters[model];
  if (normalized.includes("flux")) return fluxAdapter;
  if (normalized.includes("sdxl") || normalized.includes("stable-diffusion")) return sdxlAdapter;
  return genericAdapter;
}

export class ReplicateProvider implements BaseAIProvider {
  name = "replicate" as const;
  capabilities = ["image", "image_to_image", "upscale"] as const;
  private client?: any;

  isConfigured() {
    return Boolean(aiConfig.replicate.token);
  }

  private getClient() {
    if (!aiConfig.replicate.token) throw new ProviderConfigurationError("Missing REPLICATE_API_TOKEN");
    this.client ??= new Replicate({ auth: aiConfig.replicate.token });
    return this.client;
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const model = input.model ?? (input.referenceImageUrl ? aiConfig.replicate.defaultImageToImageModel : undefined) ?? aiConfig.replicate.defaultTextToImageModel;
    const replicateInput = adapterFor(model)(input);
    try {
      const raw = await withTimeout(
        this.getClient().run(model as `${string}/${string}`, { input: replicateInput }),
        aiConfig.defaults.imageGenerationTimeoutMs,
        "Replicate model timeout"
      );
      const imageUrl = normalizeReplicateImageUrl(raw);
      return {
        provider: this.name,
        model,
        imageUrl,
        seed: input.seed,
        raw,
        metadata: { input: replicateInput, referenceImage: Boolean(input.referenceImageUrl) }
      };
    } catch (error) {
      if (error instanceof ProviderConfigurationError || error instanceof ProviderError) throw error;
      if (error instanceof Error && error.message.includes("timeout")) throw new ProviderTimeoutError("Replicate model timeout");
      throw new ProviderError("REPLICATE_GENERATION_FAILED", error instanceof Error ? error.message : "Replicate model failed", true);
    }
  }

  async upscaleImage(imageUrl: string, options: Record<string, unknown> = {}): Promise<ImageGenerationResult> {
    const model = aiConfig.replicate.defaultUpscaleModel;
    if (!model) throw new ProviderConfigurationError("Missing REPLICATE_DEFAULT_UPSCALE_MODEL");
    const raw = await withTimeout(
      this.getClient().run(model as `${string}/${string}`, { input: { image: imageUrl, ...options } }),
      aiConfig.defaults.imageGenerationTimeoutMs,
      "Replicate upscale timeout"
    );
    return { provider: this.name, model, imageUrl: normalizeReplicateImageUrl(raw), raw, metadata: { upscale: true } };
  }
}
