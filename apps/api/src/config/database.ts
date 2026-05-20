import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { ensureCryptoTransactionIndexes } from "../models/CryptoTransaction.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production"
  });
  await ensureCryptoTransactionIndexes();
  logger.info("MongoDB connected");
}
