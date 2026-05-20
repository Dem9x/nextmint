import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { Generation } from "../models/Generation.js";
import { aiRouterService } from "../ai/services/ai-router.service.js";
import { createQueuedImageGeneration } from "../ai/services/nft-generation.service.js";
import { aiConfig } from "../config/ai.config.js";
import { assertDailyFreeLimit } from "../ai/utils/rate-limit.js";
import { FreeTierLimitError } from "../ai/utils/provider-errors.js";
import { asyncHandler } from "../utils/async-handler.js";

const promptSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  style: z.string().trim().max(200).optional(),
  collectionTheme: z.string().trim().max(300).optional()
});

const imageSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  negativePrompt: z.string().trim().max(2000).optional(),
  provider: z.enum(["replicate", "huggingface", "flux", "comfyui"]).optional(),
  model: z.string().trim().max(200).optional(),
  width: z.number().int().min(256).max(1024).default(1024),
  height: z.number().int().min(256).max(1024).default(1024),
  seed: z.number().int().optional(),
  referenceImageUrl: z.string().url().optional(),
  style: z.string().trim().max(200).optional()
});

export const enhancePrompt = asyncHandler(async (req: AuthRequest, res) => {
  const body = promptSchema.parse(req.body);
  const result = await aiRouterService.enhancePrompt({
    prompt: body.prompt,
    style: body.style,
    collectionTheme: body.collectionTheme,
    userId: req.user!.id,
    purpose: "prompt_enhancement"
  });
  if (!result.success || !result.data) throw new AppError(500, result.error?.message ?? "Prompt enhancement failed");
  res.json({
    enhancedPrompt: result.data.enhancedPrompt,
    negativePrompt: result.data.negativePrompt,
    provider: result.provider,
    usedFallback: result.usedFallback
  });
});

export const generateImage = asyncHandler(async (req: AuthRequest, res) => {
  const body = imageSchema.parse(req.body);
  if (aiConfig.defaults.freeTierMode) {
    try {
      await assertDailyFreeLimit({ userId: req.user!.id, provider: body.provider ?? "replicate", taskType: "image", max: aiConfig.defaults.maxDailyFreeRequests });
    } catch (error) {
      if (error instanceof FreeTierLimitError) {
        throw new AppError(402, error.code, { message: error.message });
      }
      throw error;
    }
  }
  const generation = await createQueuedImageGeneration({ ...body, userId: req.user!.id });
  res.status(202).json({ generationId: String(generation._id), status: "queued" });
});

export const getGeneration = asyncHandler(async (req: AuthRequest, res) => {
  const generation = await Generation.findOne({ _id: req.params.id, user: req.user!.id }).lean();
  if (!generation) throw new AppError(404, "Generation not found");
  res.json({
    id: String(generation._id),
    status: generation.status,
    progress: generation.progress,
    imageUrl: generation.imageUrl,
    imageIpfsUri: generation.imageIpfsUri,
    metadataIpfsUri: generation.metadataIpfsUri,
    nftItemId: generation.nftItem ? String(generation.nftItem) : undefined,
    enhancedPrompt: generation.enhancedPrompt,
    negativePrompt: generation.negativePrompt,
    provider: generation.provider,
    usedFallback: generation.usedFallback,
    error: generation.error ?? null
  });
});

export const listProviders = asyncHandler(async (_req, res) => {
  res.json({ providers: aiRouterService.providers() });
});
