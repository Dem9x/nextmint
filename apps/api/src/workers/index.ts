// apps/api/src/workers/index.ts
import { logger } from "../config/logger.js";
import { connectDatabase } from "../config/database.js";
import { createWorker } from "../queues/connection.js";
import { verifyCryptoPayment } from "../services/crypto/payment.service.js";
import { enqueueConfirmationsForPendingPayments } from "../services/crypto/indexer.service.js";
import { startImageGenerationWorker } from "../queues/image-generation.worker.js";
import { startPromptEnhancementWorker } from "../queues/prompt-enhancement.worker.js";
import { startCollectionGenerationWorker } from "../queues/collection-generation.worker.js";
import { startSubscriptionExpiryWorker } from "./subscription-expiry.worker.js";

await connectDatabase();

const workers = [
  startPromptEnhancementWorker(),
  startImageGenerationWorker(),
  startCollectionGenerationWorker(),
  startSubscriptionExpiryWorker(),

  createWorker<{ userId: string; paymentId: string; txHash: `0x${string}` }>(
    "tx-index",
    async (job) => {
      await verifyCryptoPayment(job.data);
    },
    10
  )
];

enqueueConfirmationsForPendingPayments().catch((error) =>
  logger.error({ error }, "initial payment confirmation sweep failed")
);

const paymentSweepInterval = setInterval(() => {
  enqueueConfirmationsForPendingPayments().catch((error) =>
    logger.error({ error }, "payment confirmation sweep failed")
  );
}, 60_000);

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down NEXMINT workers");

  clearInterval(paymentSweepInterval);

  await Promise.allSettled(workers.map((worker) => worker.close()));

  logger.info("NEXMINT workers stopped");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (error) => {
  logger.error({ error }, "unhandled rejection in worker process");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "uncaught exception in worker process");
  process.exit(1);
});

logger.info("NEXMINT workers started");