import { Queue, Worker, type JobsOptions } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env.js";

export const queueConnection = new (Redis as any)(env.REDIS_URL, { maxRetriesPerRequest: null });

export const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: 500,
  removeOnFail: 1000
};

export const metadataQueue = new Queue("metadata", { connection: queueConnection, defaultJobOptions });
export const ipfsUploadQueue = new Queue("ipfs-upload", { connection: queueConnection, defaultJobOptions });
export const contractDeployQueue = new Queue("contract-deploy", { connection: queueConnection, defaultJobOptions });
export const txIndexQueue = new Queue("tx-index", { connection: queueConnection, defaultJobOptions });

export function createWorker<T>(name: string, processor: ConstructorParameters<typeof Worker<T>>[1], concurrency = 5) {
  return new Worker<T>(name, processor, { connection: queueConnection, concurrency });
}
