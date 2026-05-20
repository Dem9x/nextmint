import { logger } from "../config/logger.js";
import { expireDueSubscriptions } from "../services/subscription.service.js";

export function startSubscriptionExpiryWorker() {
  const run = async () => {
    try {
      const count = await expireDueSubscriptions();
      if (count > 0) logger.info({ count }, "expired subscriptions processed");
    } catch (error) {
      logger.error({ error }, "subscription expiry sweep failed");
    }
  };
  void run();
  return setInterval(run, 60 * 60_000);
}
