import crypto from "node:crypto";
import { AIUsageLog } from "../../models/AIUsageLog.js";
import { User } from "../../models/User.js";
import { priceAIUsage } from "../../services/credits/pricing.service.js";
import type { AITaskType, AIProviderName } from "../types/ai.types.js";

export function hashPrompt(prompt: string) {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

export async function logAIUsage(input: {
  userId?: string;
  collectionId?: string;
  generationId?: string;
  provider: AIProviderName;
  model: string;
  taskType: AITaskType;
  prompt: string;
  status: "success" | "failed";
  latencyMs: number;
  usedFallback: boolean;
  errorCode?: string;
  errorMessage?: string;
  estimatedCostUsd?: number;
  creditsCharged?: number;
  userPlan?: string;
  isFreeTier?: boolean;
}) {
  const pricing = priceAIUsage(input.model);
  const user = input.userId && !input.userPlan ? await User.findById(input.userId).select("plan").lean() : undefined;
  await AIUsageLog.create({
    userId: input.userId,
    collectionId: input.collectionId,
    generationId: input.generationId,
    provider: input.provider,
    model: input.model,
    taskType: input.taskType,
    promptHash: hashPrompt(input.prompt),
    status: input.status,
    latencyMs: input.latencyMs,
    usedFallback: input.usedFallback,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    estimatedCostUsd: input.estimatedCostUsd ?? pricing.estimatedCostUsd,
    creditsCharged: input.creditsCharged ?? pricing.credits,
    userPlan: input.userPlan ?? user?.plan,
    isFreeTier: Boolean(input.isFreeTier)
  });
}
