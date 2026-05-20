// apps/api/src/queues/image-generation.worker.ts
import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { Generation } from "../models/Generation.js";
import { queueConnection } from "./connection.js";
import { aiRouterService } from "../ai/services/ai-router.service.js";

export function startImageGenerationWorker() {
  const worker = new Worker<{ generationId: string }>(
    "image-generation",
    async (job) => {
      const generation = await Generation.findById(job.data.generationId);

      if (!generation) {
        logger.warn(
          { generationId: job.data.generationId },
          "image generation skipped because generation was not found"
        );
        return;
      }

      generation.status = "generating_image";
      generation.progress = Math.max(generation.progress ?? 0, 55);
      generation.error = undefined;
      await generation.save();

      const output = (generation.output ?? {}) as {
        width?: number;
        height?: number;
        referenceImageUrl?: string;
        style?: string;
      };

      const result = await aiRouterService.generateImage({
        prompt: generation.enhancedPrompt ?? generation.prompt,
        negativePrompt: generation.negativePrompt ?? undefined,
        width: output.width,
        height: output.height,
        referenceImageUrl: output.referenceImageUrl,
        style: output.style,
        seed: generation.seed ?? undefined,
        userId: String(generation.user),
        collectionId: generation.collection ? String(generation.collection) : undefined,
        generationId: String(generation._id),
        provider: generation.imageProvider,
        model: typeof (generation as any).model === "string" ? (generation as any).model : undefined
      });

      if (!result.success || !result.data) {
        const errorMessage = result.error?.message ?? "Image generation failed";

        const maxAttempts = job.opts.attempts ?? 1;
        const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

        generation.status = isFinalAttempt ? "failed" : "retrying_image";
        generation.error = errorMessage;
        generation.progress = isFinalAttempt ? generation.progress : 55;
        await generation.save();

        throw new Error(errorMessage);
      }

      generation.provider = result.provider;

      generation.imageProvider =
        result.provider === "openrouter" || result.provider === "local-template-fallback"
          ? "replicate"
          : result.provider;

      generation.set("model", result.model);
      generation.imageUrl = result.data.imageUrl;
      generation.output = {
        ...(generation.output as Record<string, unknown>),
        image: result.data
      };
      generation.usedFallback = generation.usedFallback || result.usedFallback;
      generation.status = "image_ready";
      generation.progress = 70;
      generation.error = undefined;

      await generation.save();
    },
    {
      connection: queueConnection,
      concurrency: 2
    }
  );

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        generationId: job?.data.generationId,
        attemptsMade: job?.attemptsMade,
        attempts: job?.opts.attempts,
        error
      },
      "image generation failed"
    );
  });

  return worker;
}