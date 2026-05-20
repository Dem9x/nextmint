import { env } from "./env.js";

export const aiConfig = {
  replicate: {
    token: env.REPLICATE_API_TOKEN,
    defaultTextToImageModel: env.REPLICATE_DEFAULT_TEXT_TO_IMAGE_MODEL,
    defaultUpscaleModel: env.REPLICATE_DEFAULT_UPSCALE_MODEL,
    defaultImageToImageModel: env.REPLICATE_DEFAULT_IMAGE_TO_IMAGE_MODEL
  },
  openRouter: {
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL,
    defaultModel: env.AI_FREE_TIER_MODE ? "openrouter/free" : env.OPENROUTER_DEFAULT_MODEL,
    siteUrl: env.OPENROUTER_SITE_URL,
    appName: env.OPENROUTER_APP_NAME
  },
  defaults: {
    imageProvider: env.AI_DEFAULT_IMAGE_PROVIDER,
    textProvider: env.AI_DEFAULT_TEXT_PROVIDER,
    freeTierMode: env.AI_FREE_TIER_MODE,
    maxDailyFreeRequests: env.AI_MAX_DAILY_FREE_REQUESTS,
    requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    imageGenerationTimeoutMs: env.AI_IMAGE_GENERATION_TIMEOUT_MS
  }
};
