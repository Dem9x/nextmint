import { createClient } from "redis";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (error) => {
  const err = error as NodeJS.ErrnoException & { hostname?: string };
  logger.error(
    {
      code: err.code,
      hostname: err.hostname
    },
    "Redis connection error. Check REDIS_URL. Cloud Redis often requires rediss:// and URL-encoded passwords."
  );
});

export async function connectRedis() {
  if (!redis.isOpen) {
    try {
      await redis.connect();
    } catch (error) {
      throw new Error(
        `Unable to connect to Redis. Check REDIS_URL. Use rediss:// for TLS cloud Redis and URL-encode special characters in passwords. Cause: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }
}
