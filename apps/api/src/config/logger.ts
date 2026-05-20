import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV === "development" && process.env.PINO_PRETTY !== "false" ? { target: "pino-pretty" } : undefined
});
