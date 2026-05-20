const modelCreditMap: Array<{ pattern: RegExp; credits: number; estimatedCostUsd: number | null }> = [
  { pattern: /flux-schnell/i, credits: 4, estimatedCostUsd: null },
  { pattern: /sdxl|stable-diffusion/i, credits: 6, estimatedCostUsd: null },
  { pattern: /openrouter\/free/i, credits: 0, estimatedCostUsd: null }
];

export function priceAIUsage(model: string) {
  return modelCreditMap.find((entry) => entry.pattern.test(model)) ?? { credits: 5, estimatedCostUsd: null };
}

export function planDailyLimit(plan: string) {
  if (plan === "enterprise") return Number.POSITIVE_INFINITY;
  if (plan === "pro") return 500;
  if (plan === "starter") return 100;
  return 25;
}
