import crypto from "node:crypto";

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export const tierWeights: Record<RarityTier, number> = {
  common: 45,
  uncommon: 25,
  rare: 15,
  epic: 9,
  legendary: 5,
  mythic: 1
};

export type TraitOption = { layer: string; value: string; rarityTier: RarityTier; weight?: number };

export function pickWeighted<T extends { weight?: number; rarityTier?: RarityTier }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? tierWeights[item.rarityTier as RarityTier] ?? 1), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight ?? tierWeights[item.rarityTier as RarityTier] ?? 1;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

export function generateTraitSet(layers: Record<string, TraitOption[]>) {
  const attributes = Object.entries(layers).map(([layer, options]) => ({ ...pickWeighted(options), layer }));
  const hash = crypto.createHash("sha256").update(JSON.stringify(attributes.map((a) => [a.layer, a.value]).sort())).digest("hex");
  const rarityScore = attributes.reduce((score, attr) => score + 100 / (attr.weight ?? tierWeights[attr.rarityTier]), 0);
  return { attributes, traitHash: hash, rarityScore: Number(rarityScore.toFixed(4)) };
}

export function rankByRarity<T extends { rarityScore: number }>(items: T[]) {
  return [...items].sort((a, b) => b.rarityScore - a.rarityScore).map((item, index) => ({ ...item, rarityRank: index + 1 }));
}
