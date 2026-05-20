export const supportedPlans = {
  free: { name: "Free", credits: 25, maxCollectionSize: 10 },
  starter: { name: "Starter", credits: 800, maxCollectionSize: 1000 },
  pro: { name: "Pro", credits: 4000, maxCollectionSize: 5000 },
  enterprise: { name: "Enterprise", credits: 20000, maxCollectionSize: 10000 }
} as const;

export const supportedTokens = ["ETH", "USDC", "USDT", "DAI"] as const;
export type SupportedToken = (typeof supportedTokens)[number];
