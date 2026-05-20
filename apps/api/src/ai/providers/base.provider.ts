import type { AIProviderCapability, AIProviderName, ImageGenerationInput, ImageGenerationResult, TextGenerationInput, TextGenerationResult } from "../types/ai.types.js";

export interface BaseAIProvider {
  name: AIProviderName;
  capabilities: readonly AIProviderCapability[];
  isConfigured(): boolean;
  generateImage?(input: ImageGenerationInput): Promise<ImageGenerationResult>;
  generateText?(input: TextGenerationInput): Promise<TextGenerationResult>;
  enhancePrompt?(input: TextGenerationInput): Promise<TextGenerationResult>;
  upscaleImage?(imageUrl: string, options?: Record<string, unknown>): Promise<ImageGenerationResult>;
}
