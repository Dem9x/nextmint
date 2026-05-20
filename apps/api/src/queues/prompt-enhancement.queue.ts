import { Queue, type JobsOptions } from "bullmq";
import { queueConnection } from "./connection.js";

export type PromptEnhancementJob = { generationId: string };

export const promptEnhancementJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: 500,
  removeOnFail: 1000
};

export const promptEnhancementQueue = new Queue<PromptEnhancementJob>("prompt-enhancement", {
  connection: queueConnection,
  defaultJobOptions: promptEnhancementJobOptions
});
