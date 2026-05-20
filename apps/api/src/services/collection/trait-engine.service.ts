import { createHash } from "node:crypto";

export type RolledTrait = { trait_type: string; value: string };

const traitPools: Record<string, string[]> = {
  Background: ["Neon Tokyo", "Rainy Megacity Alley", "Mars Market", "Cyber Temple", "Floating Data Harbor", "Holographic Bazaar"],
  Body: ["Chrome Fur", "Midnight Fur", "Iridescent Armor Plates", "Carbon Fiber Fur", "Golden Circuit Fur"],
  Outfit: ["Neon Kimono", "Samurai Armor", "Hacker Hoodie", "Quantum Pilot Jacket", "Royal Synth Cloak"],
  Headwear: ["Holographic Visor", "Data Crown", "Chrome Oni Mask", "Signal Antenna", "None"],
  Eyes: ["Blue Laser", "Gold Cyber Eyes", "Holographic Visor", "Emerald Scanner", "Glitch Pupils"],
  Mouth: ["Calm Smirk", "Neon Fangs", "Pixel Snarl", "Silent Focus", "Gold Grill"],
  Accessory: ["Chrome Whiskers", "Data Katana", "Floating Drone", "Synth Amulet", "Plasma Scroll"],
  Aura: ["Cyan Glow", "Magenta Glitch", "Golden Static", "Void Pulse", "Mythic Prism"]
};

const rarityWeights = [
  { tier: "Common", weight: 500, score: 50 },
  { tier: "Uncommon", weight: 250, score: 85 },
  { tier: "Rare", weight: 150, score: 130 },
  { tier: "Epic", weight: 70, score: 190 },
  { tier: "Legendary", weight: 25, score: 280 },
  { tier: "Mythic", weight: 5, score: 420 }
];

function seeded(seed: string) {
  const hash = createHash("sha256").update(seed).digest();
  let index = 0;
  return () => {
    index = (index + 1) % hash.length;
    return hash[index] / 255;
  };
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length) % items.length];
}

function pickRarity(random: () => number) {
  const total = rarityWeights.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const rarity of rarityWeights) {
    roll -= rarity.weight;
    if (roll <= 0) return rarity;
  }
  return rarityWeights[0];
}

export function hashTraits(traits: RolledTrait[]) {
  return createHash("sha256").update(traits.map((trait) => `${trait.trait_type}:${trait.value}`).join("|")).digest("hex");
}

export function rollUniqueTraits(tokenNumber: number, usedHashes: Set<string>, maxRetries = 20) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const random = seeded(`${tokenNumber}:${attempt}:nexmint`);
    const rarity = pickRarity(random);
    const traits = Object.entries(traitPools).map(([trait_type, values]) => ({ trait_type, value: pick(values, random) }));
    traits.push({ trait_type: "Rarity", value: rarity.tier });
    const traitHash = hashTraits(traits);
    if (!usedHashes.has(traitHash)) {
      usedHashes.add(traitHash);
      const rarityScore = rarity.score + traits.reduce((sum, trait) => sum + (trait.value.length % 11), 0);
      return { traits, traitHash, rarityTier: rarity.tier, rarityScore };
    }
  }
  throw new Error(`Unable to roll unique traits for token #${tokenNumber}`);
}

export function buildTokenPrompt(input: { basePrompt: string; style?: string; tokenNumber: number; rarityTier: string; traits: RolledTrait[] }) {
  const traitText = input.traits.map((trait) => `${trait.trait_type}: ${trait.value}`).join(", ");
  return `${input.basePrompt} #${input.tokenNumber}, ${input.rarityTier} rarity, ${traitText}, ${input.style ?? "premium Web3 collectible"}, cinematic lighting, sharp composition, high detail`;
}

export const defaultNegativePrompt = "blurry, low quality, duplicate character, distorted anatomy, watermark, text artifacts, bad composition, noisy background";
