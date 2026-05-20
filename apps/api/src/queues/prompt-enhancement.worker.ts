import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { Generation } from "../models/Generation.js";
import { queueConnection } from "./connection.js";
import { imageGenerationQueue } from "./image-generation.queue.js";
import { aiRouterService } from "../ai/services/ai-router.service.js";

export function startPromptEnhancementWorker() {
  const worker = new Worker<{ generationId: string }>(
    "prompt-enhancement",
    async (job) => {
      const generation = await Generation.findById(job.data.generationId);
      if (!generation) return;
      generation.status = "enhancing_prompt";
      generation.progress = 20;
      await generation.save();

      const result = await aiRouterService.enhancePrompt({
        prompt: generation.prompt,
        style: generation.style ?? undefined,
        userId: String(generation.user),
        collectionId: generation.collection ? String(generation.collection) : undefined,
        generationId: String(generation._id),
        purpose: "prompt_enhancement"
      });

      if (!result.success || !result.data) throw new Error(result.error?.message ?? "Prompt enhancement failed");
      generation.enhancedPrompt = result.data.enhancedPrompt;
      generation.negativePrompt = result.data.negativePrompt;
      generation.textProvider = result.provider === "openrouter" ? "openrouter" : "local-template-fallback";
      generation.usedFallback = result.usedFallback;
      generation.progress = 40;
      await generation.save();
      await imageGenerationQueue.add("generate-image", { generationId: String(generation._id) });
    },
    { connection: queueConnection, concurrency: 5 }
  );

  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error }, "prompt enhancement failed"));
  return worker;
}
