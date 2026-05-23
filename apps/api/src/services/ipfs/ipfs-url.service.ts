import { env } from "../../config/env.js";

export function isIpfsUri(uri?: string): uri is string {
  return Boolean(uri?.startsWith("ipfs://"));
}

export function normalizeIpfsUri(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) return `ipfs://${uri.replace("ipfs://", "").replace(/^\/+/, "")}`;
  if (uri.includes("/ipfs/")) return `ipfs://${uri.split("/ipfs/")[1].replace(/^\/+/, "")}`;
  return uri;
}

export function ipfsToGatewayUrl(uri: string) {
  const normalized = normalizeIpfsUri(uri);
  if (!isIpfsUri(normalized)) return uri;
  const gateway = (env.FILEBASE_GATEWAY || env.PINATA_GATEWAY || env.PINATA_GATEWAY_URL || "https://ipfs.io/ipfs").replace(/\/$/, "");
  return `${gateway}/${normalized.replace("ipfs://", "").replace(/^\/+/, "")}`;
}
