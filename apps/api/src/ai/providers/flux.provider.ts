import type { ImageGenerationInput, ImageGenerationResult } from "../types/ai.types.js";
import { ProviderConfigurationError, ProviderError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "./base.provider.js";

export class FluxProvider implements BaseAIProvider {
  name = "flux" as const;
  capabilities = ["image", "image_to_image"] as const;

  isConfigured() {
    return Boolean(process.env.FLUX_API_URL && process.env.FLUX_API_KEY);
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!this.isConfigured()) throw new ProviderConfigurationError("Missing FLUX_API_URL or FLUX_API_KEY");
    const response = await fetch(process.env.FLUX_API_URL!, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.FLUX_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) throw new ProviderError("FLUX_GENERATION_FAILED", `FLUX failed with ${response.status}`, response.status >= 500 || response.status === 429);
    const data = (await response.json()) as { imageUrl?: string; url?: string; model?: string };
    const imageUrl = data.imageUrl ?? data.url;
    if (!imageUrl) throw new ProviderError("FLUX_NO_OUTPUT", "FLUX returned no image URL", true);
    return { provider: this.name, model: data.model ?? input.model ?? "flux", imageUrl, seed: input.seed, raw: data, metadata: {} };
  }
}
