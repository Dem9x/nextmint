import type { ImageGenerationInput, ImageGenerationResult } from "../types/ai.types.js";
import { clampImageSize } from "../utils/image-utils.js";
import { ProviderConfigurationError, ProviderError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "./base.provider.js";

export class HuggingFaceProvider implements BaseAIProvider {
  name = "huggingface" as const;
  capabilities = ["image"] as const;

  isConfigured() {
    return Boolean(process.env.HUGGINGFACE_API_KEY);
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!process.env.HUGGINGFACE_API_KEY) throw new ProviderConfigurationError("Missing HUGGINGFACE_API_KEY");
    const model = input.model ?? "stabilityai/stable-diffusion-xl-base-1.0";
    const size = clampImageSize(input.width, input.height);
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: input.prompt, parameters: { negative_prompt: input.negativePrompt, width: size.width, height: size.height } })
    });
    if (!response.ok) throw new ProviderError("HUGGINGFACE_GENERATION_FAILED", `HuggingFace failed with ${response.status}`, response.status >= 500 || response.status === 429);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.error) throw new ProviderError("HUGGINGFACE_ERROR", data.error, true);
    }
    throw new ProviderError("HUGGINGFACE_BINARY_OUTPUT_UNSUPPORTED", "HuggingFace returned binary image data; configure IPFS/object storage handoff before enabling direct URL mode", false);
  }
}
