import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.js";

type NftStorageResponse = {
  ok: boolean;
  value?: {
    cid: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function getToken() {
  return env.NFT_STORAGE_TOKEN || env.NFT_STORAGE_API_KEY;
}

function assertNftStorageConfigured() {
  if (!getToken()) throw new AppError(500, "NFT.Storage token is not configured");
}

function nftStorageGatewayUrl(cid: string) {
  return `${env.NFT_STORAGE_GATEWAY_URL.replace(/\/$/, "")}/${cid}`;
}

async function parseNftStorageResponse(response: Response) {
  const body = (await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }))) as NftStorageResponse & { raw?: string };
  if (!response.ok || !body.ok || !body.value?.cid) {
    const message = body.error?.message || body.raw || response.statusText;
    throw new AppError(response.status || 502, `NFT.Storage upload failed: ${message}`);
  }
  return { cid: body.value.cid, uri: `ipfs://${body.value.cid}`, url: nftStorageGatewayUrl(body.value.cid) };
}

export async function uploadBufferToNftStorage(name: string, buffer: Buffer, contentType = "application/octet-stream") {
  assertNftStorageConfigured();
  const response = await fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": contentType,
      "X-Nft-Storage-Filename": name
    },
    body: new Uint8Array(buffer)
  });
  return parseNftStorageResponse(response);
}

export async function uploadJsonToNftStorage(name: string, json: unknown) {
  return uploadBufferToNftStorage(name, Buffer.from(JSON.stringify(json)), "application/json");
}
