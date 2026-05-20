import { Generation } from "../../models/Generation.js";
import { User } from "../../models/User.js";
import { AppError } from "../../middleware/error.js";
import { imageGenerationQueue } from "../../queues/image-generation.queue.js";
import { promptEnhancementQueue } from "../../queues/prompt-enhancement.queue.js";
import { CreditLedger } from "../../models/CreditLedger.js";
import { priceAIUsage } from "../../services/credits/pricing.service.js";
import type { ImageGenerationInput } from "../types/ai.types.js";

export async function createQueuedImageGeneration(input: ImageGenerationInput & { prompt: string; userId: string }) {
  const creditPrice = priceAIUsage(input.model ?? input.provider ?? "replicate");
  const user = await User.findById(input.userId);
  if (!user) throw new AppError(404, "User not found");
  if ((user.credits ?? 0) < creditPrice.credits) {
    throw new AppError(402, "INSUFFICIENT_CREDITS", { message: "You need more credits to generate this NFT." });
  }
  user.credits -= creditPrice.credits;
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
    output: { width: input.width, height: input.height, referenceImageUrl: input.referenceImageUrl, style: input.style }
  });
  await CreditLedger.create({
    userId: input.userId,
    type: "generation_spend",
    amount: -creditPrice.credits,
    balanceAfter: user.credits,
    sourceId: generation._id,
    metadata: { model: input.model, provider: input.provider }
  });
  await promptEnhancementQueue.add("enhance-prompt", { generationId: String(generation._id) });
  return generation;
}

export async function dispatchImageGeneration(generationId: string) {
  const generation = await Generation.findById(generationId);
  if (!generation) throw new AppError(404, "Generation not found");
  await imageGenerationQueue.add("generate-image", { generationId });
}
