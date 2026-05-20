import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});
