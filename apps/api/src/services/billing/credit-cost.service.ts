export type ImageSize = 512 | 768 | 1024;

export function normalizeImageSize(width?: number, height?: number): ImageSize {
  const maxDimension = Math.max(Number(width ?? 768), Number(height ?? 768));
  if (!Number.isFinite(maxDimension) || maxDimension <= 512) return 512;
  if (maxDimension <= 768) return 768;
  return 1024;
}

export function getImageCreditCost(size: ImageSize): number {
  if (size === 512) return 1;
  if (size === 768) return 2;
  return 4;
}

export function getPromptEnhancementCreditCost(): number {
  return 0.25;
}

export function getIpfsImageUploadCreditCost(): number {
  return 0.25;
}

export function getSingleNftEstimatedCredits(input: {
  width?: number;
  height?: number;
  enhancePrompt?: boolean;
  uploadToIpfs?: boolean;
}): number {
  const size = normalizeImageSize(input.width, input.height);
  return roundCredits(
    getImageCreditCost(size) +
      (input.enhancePrompt ? getPromptEnhancementCreditCost() : 0) +
      (input.uploadToIpfs ? getIpfsImageUploadCreditCost() : 0)
  );
}

export function getCollectionEstimatedCredits(input: {
  supply: number;
  width?: number;
  height?: number;
  enhancePrompt?: boolean;
  uploadToIpfs?: boolean;
}): number {
  const perItem = getSingleNftEstimatedCredits({
    width: input.width,
    height: input.height,
    enhancePrompt: input.enhancePrompt ?? false,
    uploadToIpfs: input.uploadToIpfs ?? true
  });
  return roundCredits(input.supply * perItem);
}

function roundCredits(value: number) {
  return Math.round(value * 100) / 100;
}
