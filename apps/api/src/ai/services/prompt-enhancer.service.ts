import type { EnhancedPromptResult, TextGenerationInput } from "../types/ai.types.js";

export const defaultNegativePrompt =
  "blurry, low quality, distorted anatomy, duplicated face, watermark, text artifacts, bad composition";

export function localPromptEnhancer(input: Pick<TextGenerationInput, "prompt"> & { style?: string; collectionTheme?: string }): EnhancedPromptResult {
  const context = [input.collectionTheme, input.style].filter(Boolean).join(", ");
  const subject = input.prompt.trim();
  return {
    enhancedPrompt: [
      `High-detail NFT artwork of ${subject}`,
      context,
      "cinematic lighting",
      "sharp silhouette",
      "collectible character design",
      "futuristic background",
      "premium Web3 art style",
      "clean composition",
      "high contrast",
      "suitable for ERC721 collection"
    ]
      .filter(Boolean)
      .join(", "),
    negativePrompt: defaultNegativePrompt,
    provider: "local-template-fallback",
    model: "local-template-v1",
    usedFallback: true
  };
}

export function parseEnhancedPrompt(text: string, originalPrompt: string): { enhancedPrompt: string; negativePrompt: string } {
  const negativeMatch = text.match(/negative\s*prompt\s*:\s*(.+)$/ims);
  const cleaned = text
    .replace(/enhanced\s*prompt\s*:/i, "")
    .replace(/negative\s*prompt\s*:\s*.+$/ims, "")
    .trim();
  return {
    enhancedPrompt: cleaned || localPromptEnhancer({ prompt: originalPrompt }).enhancedPrompt,
    negativePrompt: negativeMatch?.[1]?.trim() || defaultNegativePrompt
  };
}

export function buildEnhancementPrompt(input: { prompt: string; style?: string; collectionTheme?: string }) {
  return `Enhance this NFT image prompt for a production ERC721 collection.

User prompt: ${input.prompt}
Style: ${input.style ?? "premium Web3 collectible"}
Collection theme: ${input.collectionTheme ?? "original AI NFT collection"}

Return exactly:
Enhanced Prompt: ...
Negative Prompt: ...`;
}

export function buildMetadataPrompt(input: { prompt: string; collectionTheme?: string }) {
  return `Write a concise NFT metadata description for this generated artwork.

Prompt: ${input.prompt}
Collection theme: ${input.collectionTheme ?? "NEXMINT AI collection"}

Return 1-2 sentences.`;
}
