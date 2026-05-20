import type { ImageGenerationInput, ImageGenerationResult } from "../types/ai.types.js";
import { ProviderConfigurationError, ProviderError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "./base.provider.js";

export class ComfyUIProvider implements BaseAIProvider {
  name = "comfyui" as const;
  capabilities = ["image", "image_to_image", "upscale"] as const;

  isConfigured() {
    return Boolean(process.env.COMFYUI_API_URL);
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!process.env.COMFYUI_API_URL) throw new ProviderConfigurationError("Missing COMFYUI_API_URL");
    const response = await fetch(process.env.COMFYUI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) throw new ProviderError("COMFYUI_GENERATION_FAILED", `ComfyUI failed with ${response.status}`, response.status >= 500 || response.status === 429);
    const data = (await response.json()) as { imageUrl?: string; model?: string };
    if (!data.imageUrl) throw new ProviderError("COMFYUI_NO_OUTPUT", "ComfyUI returned no image URL", true);
    return { provider: this.name, model: data.model ?? input.model ?? "comfyui", imageUrl: data.imageUrl, seed: input.seed, raw: data, metadata: {} };
  }
}
