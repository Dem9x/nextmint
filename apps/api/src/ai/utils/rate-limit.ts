import { AIUsageLog } from "../../models/AIUsageLog.js";
import { FreeTierLimitError } from "./provider-errors.js";

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function assertDailyFreeLimit(input: { userId?: string; provider: string; taskType?: string; max: number }) {
  if (!input.userId) return;
  const count = await AIUsageLog.countDocuments({
    userId: input.userId,
    provider: input.provider,
    isFreeTier: false,
    status: "success",
    createdAt: { $gte: startOfUtcDay() },
    ...(input.taskType ? { taskType: input.taskType } : {})
  });
  if (count >= input.max) throw new FreeTierLimitError();
}
