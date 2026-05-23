import { Generation } from "../../models/Generation.js";
import { User } from "../../models/User.js";
import { AppError } from "../../middleware/error.js";
import { imageGenerationQueue } from "../../queues/image-generation.queue.js";
import { promptEnhancementQueue } from "../../queues/prompt-enhancement.queue.js";
import { CreditLedger } from "../../models/CreditLedger.js";
import { getImageCreditCost, getPromptEnhancementCreditCost, normalizeImageSize } from "../../services/billing/credit-cost.service.js";
import { getActiveUserPlan } from "../../services/subscription.service.js";
import type { ImageGenerationInput } from "../types/ai.types.js";

export async function createQueuedImageGeneration(input: ImageGenerationInput & { prompt: string; userId: string }) {
  const user = await User.findById(input.userId);
  if (!user) throw new AppError(404, "User not found");
  const activePlan = await getActiveUserPlan(input.userId);
  const imageSize = normalizeImageSize(input.width, input.height);
  const creditCost = getImageCreditCost(imageSize) + getPromptEnhancementCreditCost();
  if (imageSize > Number(activePlan.limits.maxImageSize ?? 512)) {
    throw new AppError(402, "PLAN_IMAGE_SIZE_EXCEEDED", { message: `Your plan supports image size up to ${activePlan.limits.maxImageSize}px.` });
  }
  if ((user.credits ?? 0) < creditCost) {
    throw new AppError(402, "INSUFFICIENT_CREDITS", { message: `Insufficient credits. Required: ${creditCost}, available: ${user.credits ?? 0}.` });
  }
  user.credits -= creditCost;
  await user.save();
  const generation = await Generation.create({
    user: input.userId,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    provider: input.provider ?? "replicate",
    imageProvider: input.provider ?? "replicate",
    model: input.model,
    collectionSize: 1,
    status: "pending",
    seed: input.seed,
    progress: 0,
    output: { width: imageSize, height: imageSize, referenceImageUrl: input.referenceImageUrl, style: input.style, estimatedCredits: creditCost }
  });
  await CreditLedger.create({
    userId: input.userId,
    type: "generation_spend",
    amount: -creditCost,
    balanceAfter: user.credits,
    sourceId: generation._id,
    metadata: { model: input.model, provider: input.provider, imageSize, promptEnhancementCredits: getPromptEnhancementCreditCost() }
  });
  await promptEnhancementQueue.add("enhance-prompt", { generationId: String(generation._id) });
  return generation;
}

export async function dispatchImageGeneration(generationId: string) {
  const generation = await Generation.findById(generationId);
  if (!generation) throw new AppError(404, "Generation not found");
  await imageGenerationQueue.add("generate-image", { generationId });
}
