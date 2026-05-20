//apps/api/src/queues/collection-generation.queue.ts
import { Queue, type JobsOptions } from "bullmq";
import { queueConnection } from "./connection.js";

export type CollectionGenerationQueueJob = {
  collectionId: string;
  jobId: string;
};

export const collectionGenerationJobOptions: JobsOptions = {
  attempts: 4,
  backoff: {
    type: "exponential",
    delay: 30_000
  },
  removeOnComplete: 500,
  removeOnFail: 1000
};

export const collectionGenerationQueue = new Queue<CollectionGenerationQueueJob>(
  "collection-generation",
  {
    connection: queueConnection,
    defaultJobOptions: collectionGenerationJobOptions
  }
);