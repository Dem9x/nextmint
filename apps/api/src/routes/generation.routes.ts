import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { Generation } from "../models/Generation.js";
import { User } from "../models/User.js";
import { promptEnhancementQueue } from "../queues/prompt-enhancement.queue.js";
import { getCollectionEstimatedCredits } from "../services/billing/credit-cost.service.js";
import { getActiveUserPlan } from "../services/subscription.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const generationRouter = Router();
generationRouter.use(requireAuth);

generationRouter.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    prompt: z.string().min(5).max(2000),
    provider: z.enum(["replicate", "flux", "huggingface", "comfyui"]).default("replicate"),
    style: z.string().optional(),
    artDirection: z.string().optional(),
    negativePrompt: z.string().optional(),
    collectionSize: z.number().int().min(1).max(10000),
    rarityLevel: z.string().default("balanced"),
    seed: z.number().int().optional(),
    lora: z.string().optional()
  }).parse(req.body);
  const activePlan = await getActiveUserPlan(req.user!.id);
  if (body.collectionSize > Number(activePlan.limits.maxCollectionSize ?? 0)) {
    throw new AppError(402, `Your plan supports collections up to ${activePlan.limits.maxCollectionSize} NFTs.`);
  }
  const creditCost = getCollectionEstimatedCredits({ supply: body.collectionSize, width: 768, height: 768, enhancePrompt: true, uploadToIpfs: true });
  const user = await User.findById(req.user!.id);
  if (!user || user.credits < creditCost) throw new AppError(402, `Insufficient credits. Required: ${creditCost}, available: ${user?.credits ?? 0}.`);
  user.credits -= creditCost;
  await user.save();
  const generation = await Generation.create({ ...body, user: req.user!.id, status: "pending", imageProvider: body.provider });
  await promptEnhancementQueue.add("enhance-prompt", { generationId: String(generation._id) });
  res.status(202).json({ generation });
}));

generationRouter.get("/status/:id", asyncHandler(async (req: AuthRequest, res) => {
  const generation = await Generation.findOne({ _id: req.params.id, user: req.user!.id }).lean();
  if (!generation) throw new AppError(404, "Generation not found");
  res.json({ generation });
}));

generationRouter.get("/history", asyncHandler(async (req: AuthRequest, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const generations = await Generation.find({ user: req.user!.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  res.json({ generations, page, limit });
}));
