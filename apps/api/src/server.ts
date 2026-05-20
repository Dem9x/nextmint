import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectRedis } from "./config/redis.js";
import { seedDefaultAIModels } from "./models/AIModel.js";

await connectDatabase();
await seedDefaultAIModels();
await connectRedis();

const app = createApp();
app.listen(env.PORT, () => logger.info({ port: env.PORT }, "API listening"));
