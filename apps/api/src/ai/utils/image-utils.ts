import { ProviderError } from "./provider-errors.js";

export function normalizeReplicateImageUrl(output: unknown): string {
  if (typeof output === "string" && output.length > 0) return output;
  if (Array.isArray(output)) {
    const first = output.find(Boolean);
    return normalizeReplicateImageUrl(first);
  }
  if (output && typeof output === "object") {
    const candidate = output as { url?: unknown; image?: unknown; output?: unknown; href?: unknown; toString?: () => string };
    if (typeof candidate.url === "string") return candidate.url;
    if (typeof candidate.image === "string") return candidate.image;
    if (typeof candidate.href === "string") return candidate.href;
    if (candidate.output) return normalizeReplicateImageUrl(candidate.output);
    const stringified = candidate.toString?.();
    if (stringified?.startsWith("http")) return stringified;
  }
  throw new ProviderError("INVALID_IMAGE_OUTPUT", "Provider returned an invalid image output format", true);
}

export function clampImageSize(width = 1024, height = 1024, max = 1024) {
  return { width: Math.min(width, max), height: Math.min(height, max) };
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
