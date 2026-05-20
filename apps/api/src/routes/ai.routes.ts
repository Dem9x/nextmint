import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { enhancePrompt, generateImage, getGeneration, listProviders } from "../controllers/ai.controller.js";

export const aiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

aiRouter.get("/providers", listProviders);

aiRouter.use(requireAuth, aiLimiter);
aiRouter.post("/enhance-prompt", enhancePrompt);
aiRouter.post("/generate-image", generateImage);
aiRouter.get("/generation/:id", getGeneration);
