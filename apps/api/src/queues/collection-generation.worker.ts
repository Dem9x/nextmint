//apps/api/src/queues/collection-generation.worker.ts
import { logger } from "../config/logger.js";
import { createWorker } from "./connection.js";
import type { CollectionGenerationQueueJob } from "./collection-generation.queue.js";
import { processCollectionGeneration } from "../services/collection/collection-generation.service.js";

export function startCollectionGenerationWorker() {
  const worker = createWorker<CollectionGenerationQueueJob>(
    "collection-generation",
    async (job) => {
      await processCollectionGeneration(job.data.collectionId, job.data.jobId);
    },
    1
  );

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        collectionId: job?.data.collectionId,
        appJobId: job?.data.jobId,
        attemptsMade: job?.attemptsMade,
        error
      },
      "collection generation worker failed"
    );
  });

  return worker;
}
