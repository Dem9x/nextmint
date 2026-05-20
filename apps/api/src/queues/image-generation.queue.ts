//apps/api/src/queues/image-generation.queue.ts
import { Queue, type JobsOptions } from "bullmq";
import { queueConnection } from "./connection.js";

export type ImageGenerationJob = { generationId: string };

export const imageGenerationJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 10_000
  },
  removeOnComplete: 500,
  removeOnFail: 1000
};

export const imageGenerationQueue = new Queue<ImageGenerationJob>("image-generation", {
  connection: queueConnection,
  defaultJobOptions: imageGenerationJobOptions
});
