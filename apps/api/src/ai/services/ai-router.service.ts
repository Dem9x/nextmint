import { aiConfig } from "../../config/ai.config.js";
import { assertDailyFreeLimit } from "../utils/rate-limit.js";
import { FreeTierLimitError, normalizeProviderError, ProviderConfigurationError, ProviderRateLimitError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "../providers/base.provider.js";
import { ComfyUIProvider } from "../providers/comfyui.provider.js";
import { FluxProvider } from "../providers/flux.provider.js";
import { HuggingFaceProvider } from "../providers/huggingface.provider.js";
import { OpenRouterProvider } from "../providers/openrouter.provider.js";
import { ReplicateProvider } from "../providers/replicate.provider.js";
import type { AIProviderName, EnhancedPromptResult, ImageGenerationInput, ImageGenerationResult, ProviderResult, TextGenerationInput, TextGenerationResult } from "../types/ai.types.js";
import { logAIUsage } from "./ai-usage.service.js";
import { buildEnhancementPrompt, buildMetadataPrompt, localPromptEnhancer, parseEnhancedPrompt } from "./prompt-enhancer.service.js";

const providers: Record<AIProviderName, BaseAIProvider | undefined> = {
  replicate: new ReplicateProvider(),
  openrouter: new OpenRouterProvider(),
  huggingface: new HuggingFaceProvider(),
  flux: new FluxProvider(),
  comfyui: new ComfyUIProvider(),
  "local-template-fallback": undefined
};

// Production note:
// Keep provider keys, anti-abuse rules, and production fallback strategy private.
// This public implementation is intended for demo/testnet use.

function now() {
  return Date.now();
}

function isFreeModel(model: string) {
  return model.includes("free") || model.includes("schnell");
}

export class AIRouterService {
  imagePriority: AIProviderName[] = ["replicate", "flux", "huggingface", "comfyui"];
  textPriority: AIProviderName[] = ["openrouter"];

  providers() {
    return Object.entries(providers)
      .filter(([, provider]) => provider)
      .map(([name, provider]) => ({
        name,
        capabilities: provider!.capabilities,
        configured: provider!.isConfigured(),
        active: provider!.isConfigured(),
        freeTier: name === "openrouter" || name === "replicate"
      }));
  }

  async generateImage(input: ImageGenerationInput): Promise<ProviderResult<ImageGenerationResult>> {
    if (aiConfig.defaults.freeTierMode) {
      try {
        await assertDailyFreeLimit({ userId: input.userId, provider: "replicate", taskType: "image", max: aiConfig.defaults.maxDailyFreeRequests });
      } catch (error) {
        const normalized = normalizeProviderError(error);
        return {
          success: false,
          provider: input.provider ?? aiConfig.defaults.imageProvider,
          model: input.model ?? aiConfig.replicate.defaultTextToImageModel,
          error: { code: normalized.code, message: normalized.message, retryable: normalized.retryable },
          latencyMs: 0,
          usedFallback: false
        };
      }
    }
    const primary = input.provider && input.provider !== "openrouter" && input.provider !== "local-template-fallback" ? input.provider : aiConfig.defaults.imageProvider;
    const ordered = [primary, ...this.imagePriority.filter((name) => name !== primary)];
    return this.tryImageProviders(ordered, input);
  }

  async generateText(input: TextGenerationInput): Promise<ProviderResult<TextGenerationResult>> {
    const provider = providers.openrouter;
    const started = now();
    if (!provider?.generateText || !provider.isConfigured()) {
      return this.localTextResult(input, started, true);
    }
    try {
      if (aiConfig.defaults.freeTierMode) {
        await assertDailyFreeLimit({ userId: input.userId, provider: "openrouter", taskType: input.purpose, max: aiConfig.defaults.maxDailyFreeRequests });
      }
      const data = await provider.generateText(input);
      const latencyMs = now() - started;
      await logAIUsage({
        userId: input.userId,
        collectionId: input.collectionId,
        generationId: input.generationId,
        provider: data.provider,
        model: data.model,
        taskType: input.purpose,
        prompt: input.prompt,
        status: "success",
        latencyMs,
        usedFallback: false,
        isFreeTier: isFreeModel(data.model)
      });
      return { success: true, provider: data.provider, model: data.model, data, latencyMs, usedFallback: false };
    } catch (error) {
      const normalized = normalizeProviderError(error);
      if (normalized instanceof ProviderRateLimitError || normalized instanceof ProviderConfigurationError || normalized instanceof FreeTierLimitError) {
        return this.localTextResult(input, started, true, normalized.code, normalized.message);
      }
      return this.localTextResult(input, started, true, normalized.code, normalized.message);
    }
  }

  async enhancePrompt(input: TextGenerationInput & { style?: string; collectionTheme?: string }): Promise<ProviderResult<EnhancedPromptResult>> {
    const prompt = buildEnhancementPrompt(input);
    const result = await this.generateText({
      ...input,
      prompt,
      purpose: "prompt_enhancement",
      maxTokens: 700,
      temperature: 0.65
    });
    if (!result.success || !result.data || result.provider === "local-template-fallback") {
      const fallback = localPromptEnhancer(input);
      return { success: true, provider: fallback.provider, model: fallback.model, data: fallback, latencyMs: result.latencyMs, usedFallback: true };
    }
    const parsed = parseEnhancedPrompt(result.data.text, input.prompt);
    return {
      success: true,
      provider: result.provider,
      model: result.model,
      data: { ...parsed, provider: result.provider, model: result.model, usedFallback: result.usedFallback },
      latencyMs: result.latencyMs,
      usedFallback: result.usedFallback
    };
  }

  generateNFTPrompt(input: TextGenerationInput & { style?: string; collectionTheme?: string }) {
    return this.enhancePrompt(input);
  }

  async generateMetadataText(input: TextGenerationInput & { collectionTheme?: string }) {
    return this.generateText({ ...input, prompt: buildMetadataPrompt(input), purpose: "metadata", maxTokens: 220 });
  }

  private async tryImageProviders(providerNames: AIProviderName[], input: ImageGenerationInput): Promise<ProviderResult<ImageGenerationResult>> {
    let lastError: ReturnType<typeof normalizeProviderError> | undefined;
    for (const [index, providerName] of providerNames.entries()) {
      const provider = providers[providerName];
      if (!provider?.generateImage || !provider.isConfigured()) {
        lastError = new ProviderConfigurationError(`${providerName} is not configured`);
        continue;
      }
      const started = now();
      try {
        const data = await provider.generateImage(input);
        const latencyMs = now() - started;
        const usedFallback = index > 0;
        await logAIUsage({
          userId: input.userId,
          collectionId: input.collectionId,
          generationId: input.generationId,
          provider: data.provider,
          model: data.model,
          taskType: input.referenceImageUrl ? "image_to_image" : "image",
          prompt: input.prompt,
          status: "success",
          latencyMs,
          usedFallback,
          isFreeTier: isFreeModel(data.model)
        });
        return { success: true, provider: data.provider, model: data.model, data, latencyMs, usedFallback };
      } catch (error) {
        const normalized = normalizeProviderError(error);
        lastError = normalized;
        await logAIUsage({
          userId: input.userId,
          collectionId: input.collectionId,
          generationId: input.generationId,
          provider: providerName,
          model: input.model ?? "default",
          taskType: input.referenceImageUrl ? "image_to_image" : "image",
          prompt: input.prompt,
          status: "failed",
          latencyMs: now() - started,
          usedFallback: index > 0,
          errorCode: normalized.code,
          errorMessage: normalized.message,
          isFreeTier: aiConfig.defaults.freeTierMode
        });
        // A provider can return a permanent error for its own endpoint/model (for example
        // FLUX 404) while another configured provider can still produce the image.
        // Continue through the provider list so collection jobs do not die on one bad adapter.
      }
    }
    const error = lastError ?? new ProviderConfigurationError("No image provider is configured");
    return {
      success: false,
      provider: input.provider ?? aiConfig.defaults.imageProvider,
      model: input.model ?? "default",
      error: { code: error.code, message: error.message, retryable: error.retryable },
      latencyMs: 0,
      usedFallback: false
    };
  }

  private async localTextResult(input: TextGenerationInput, started: number, usedFallback: boolean, errorCode?: string, errorMessage?: string): Promise<ProviderResult<TextGenerationResult>> {
    const fallback = localPromptEnhancer(input);
    const data: TextGenerationResult = {
      provider: "local-template-fallback",
      model: "local-template-v1",
      text: input.purpose === "metadata" ? `A premium AI-generated NFT inspired by ${input.prompt}, crafted for the NEXMINT AI launchpad.` : `Enhanced Prompt: ${fallback.enhancedPrompt}\nNegative Prompt: ${fallback.negativePrompt}`
    };
    const latencyMs = now() - started;
    await logAIUsage({
      userId: input.userId,
      collectionId: input.collectionId,
      generationId: input.generationId,
      provider: data.provider,
      model: data.model,
      taskType: input.purpose,
      prompt: input.prompt,
      status: "success",
      latencyMs,
      usedFallback,
      errorCode,
      errorMessage,
      isFreeTier: true
    });
    return { success: true, provider: data.provider, model: data.model, data, latencyMs, usedFallback };
  }
}

export const aiRouterService = new AIRouterService();
