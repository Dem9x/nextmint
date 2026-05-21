import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.js";
import { uploadBufferToIpfs, uploadJsonToIpfs } from "./pinata.service.js";
import { uploadBufferToNftStorage, uploadJsonToNftStorage } from "./nft-storage.service.js";
import { buildIpfsGatewayUrl } from "./gateway-url.js";

type IpfsUploadResult = {
  ipfsHash: string;
  ipfsUri: string;
  gatewayUrl: string;
};

export function getGatewayUrl(ipfsUri: string) {
  const cid = ipfsUri.replace("ipfs://", "");
  const gateway = env.IPFS_PROVIDER === "nft_storage" ? env.NFT_STORAGE_GATEWAY_URL : env.PINATA_GATEWAY_URL || env.PINATA_GATEWAY;
  const gatewayToken = env.IPFS_PROVIDER === "nft_storage" ? undefined : env.PINATA_GATEWAY_TOKEN;
  return buildIpfsGatewayUrl(gateway, cid, gatewayToken);
}

function isPinataConfigured() {
  return Boolean(env.PINATA_JWT);
}

function isNftStorageConfigured() {
  return Boolean(env.NFT_STORAGE_TOKEN || env.NFT_STORAGE_API_KEY);
}

async function withIpfsProviderFallback<T>(operation: (provider: "pinata" | "nft_storage") => Promise<T>) {
  const providerOrder: Array<"pinata" | "nft_storage"> = env.IPFS_PROVIDER === "pinata"
    ? ["pinata"]
    : env.IPFS_PROVIDER === "nft_storage"
      ? ["nft_storage"]
      : ["pinata", "nft_storage"];
  let lastError: unknown;
  for (const provider of providerOrder) {
    if (provider === "pinata" && !isPinataConfigured()) continue;
    if (provider === "nft_storage" && !isNftStorageConfigured()) continue;
    try {
      return await operation(provider);
    } catch (error) {
      lastError = error;
      if (env.IPFS_PROVIDER !== "auto") throw error;
      console.warn(`[NEXMINT] ${provider} IPFS upload failed, trying fallback provider`, error);
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new AppError(500, "No IPFS provider configured. Set PINATA_JWT or NFT_STORAGE_TOKEN.");
}

export async function uploadBuffer(name: string, buffer: Buffer, contentType = "application/octet-stream"): Promise<IpfsUploadResult> {
  const result = await withIpfsProviderFallback((provider) => (
    provider === "pinata"
      ? uploadBufferToIpfs(name, buffer, contentType)
      : uploadBufferToNftStorage(name, buffer, contentType)
  ));
  return { ipfsHash: result.cid, ipfsUri: result.uri, gatewayUrl: result.url };
}

export async function uploadImageFromUrl(imageUrl: string): Promise<IpfsUploadResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new AppError(response.status, `Unable to fetch generated image: ${response.statusText}`);
  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) throw new AppError(400, "Generated URL did not return an image");
  const extension = contentType.split("/")[1]?.split(";")[0] ?? "png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadBuffer(`nexmint-ai-image.${extension}`, buffer, contentType);
}

export async function uploadJson(metadata: unknown): Promise<IpfsUploadResult> {
  const result = await withIpfsProviderFallback((provider) => (
    provider === "pinata"
      ? uploadJsonToIpfs("nexmint-ai-metadata.json", metadata)
      : uploadJsonToNftStorage("nexmint-ai-metadata.json", metadata)
  ));
  return { ipfsHash: result.cid, ipfsUri: result.uri, gatewayUrl: result.url };
}

export async function uploadJsonDirectory(files: Array<{ path: string; json: unknown }>): Promise<IpfsUploadResult> {
  const buildForm = () => {
    const form = new FormData();
    files.forEach((file, index) => {
      const normalizedPath = file.path.replace(/^\/+/, "");
      const uploadPath = normalizedPath.includes("/") ? normalizedPath : `metadata/${normalizedPath}`;
      form.append("file", new Blob([JSON.stringify(file.json)], { type: "application/json" }), uploadPath);
    });
    return form;
  };
  const buildNftStorageForm = () => {
    const form = new FormData();
    for (const file of files) {
      const normalizedPath = file.path.replace(/^\/+/, "");
      form.append("file", new Blob([JSON.stringify(file.json)], { type: "application/json" }), normalizedPath);
    }
    return form;
  };
  const result = await withIpfsProviderFallback(async (provider) => {
    if (provider === "pinata") {
      const form = buildForm();
      form.append("pinataMetadata", JSON.stringify({ name: "nexmint-collection-metadata" }));
      form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.PINATA_JWT}` },
        body: form
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        let message = body || response.statusText;
        try {
          const parsed = JSON.parse(body) as { error?: { reason?: string; details?: string; message?: string }; message?: string };
          message = parsed.error?.details ?? parsed.error?.reason ?? parsed.error?.message ?? parsed.message ?? message;
        } catch {
          // Legacy Pinata can return plain text.
        }
        throw new AppError(response.status, `Pinata directory upload failed: ${message}`);
      }
      const data = (await response.json()) as { IpfsHash: string };
      const cid = data.IpfsHash;
      const gateway = env.PINATA_GATEWAY_URL || env.PINATA_GATEWAY;
      return { cid, uri: `ipfs://${cid}`, url: buildIpfsGatewayUrl(gateway, cid, env.PINATA_GATEWAY_TOKEN) };
    }
      const response = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.NFT_STORAGE_TOKEN || env.NFT_STORAGE_API_KEY}` },
      body: buildNftStorageForm()
    });
    if (!response.ok) throw new AppError(response.status, `NFT.Storage directory upload failed: ${await response.text().catch(() => response.statusText)}`);
    const data = (await response.json()) as { ok: boolean; value?: { cid: string }; error?: { message?: string } };
    if (!data.ok || !data.value?.cid) throw new AppError(502, `NFT.Storage directory upload failed: ${data.error?.message ?? "missing CID"}`);
    const cid = data.value.cid;
    return { cid, uri: `ipfs://${cid}`, url: buildIpfsGatewayUrl(env.NFT_STORAGE_GATEWAY_URL, cid) };
  });
  return { ipfsHash: result.cid, ipfsUri: `${result.uri}/`, gatewayUrl: result.url };
}
