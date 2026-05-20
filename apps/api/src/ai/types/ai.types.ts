export type AIProviderName = "replicate" | "openrouter" | "huggingface" | "flux" | "comfyui" | "local-template-fallback";

export type AIProviderCapability =
  | "text"
  | "image"
  | "image_to_image"
  | "upscale"
  | "prompt_enhancement"
  | "metadata"
  | "traits";

export type AITaskType = "image" | "image_to_image" | "upscale" | "prompt_enhancement" | "metadata" | "traits" | "lore" | "negative_prompt";

export type ImageGenerationInput = {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  referenceImageUrl?: string;
  style?: string;
  collectionId?: string;
  generationId?: string;
  userId?: string;
  provider?: AIProviderName;
  model?: string;
};

export type ImageGenerationResult = {
  provider: AIProviderName;
  model: string;
  imageUrl: string;
  seed?: number;
  raw?: unknown;
  metadata: Record<string, unknown>;
};

export type TextGenerationInput = {
  systemPrompt?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  collectionId?: string;
  generationId?: string;
  purpose: AITaskType;
};

export type TextGenerationResult = {
  provider: AIProviderName;
  model: string;
  text: string;
  raw?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type ProviderResult<T> = {
  success: boolean;
  provider: AIProviderName;
  model: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  latencyMs: number;
  usedFallback: boolean;
};

export type EnhancedPromptResult = {
  enhancedPrompt: string;
  negativePrompt: string;
  provider: AIProviderName;
  model: string;
  usedFallback: boolean;
};
