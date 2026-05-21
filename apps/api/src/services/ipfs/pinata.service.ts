import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.js";
import { buildIpfsGatewayUrl } from "./gateway-url.js";

function assertPinataConfigured() {
  if (!env.PINATA_JWT) throw new AppError(500, "Pinata JWT is not configured");
}

async function parsePinataResponse(response: Response) {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let message = body || response.statusText;
    try {
      const parsed = JSON.parse(body) as { error?: { reason?: string; details?: string; message?: string }; message?: string };
      message = parsed.error?.details ?? parsed.error?.reason ?? parsed.error?.message ?? parsed.message ?? message;
    } catch {
      // Keep raw body when Pinata returns plain text or HTML.
    }
    if (response.status === 401 || response.status === 403 || /not authorized|unauthorized/i.test(message)) {
      throw new AppError(response.status, "Pinata legacy upload is not authorized. Use a Pinata API JWT with legacy pinFileToIPFS scope, or set IPFS_PROVIDER=auto with another provider fallback.");
    }
    throw new AppError(response.status, `Pinata legacy upload failed: ${message}`);
  }
  const data = (await response.json()) as { IpfsHash: string };
  const gateway = env.PINATA_GATEWAY_URL || env.PINATA_GATEWAY;
  return { cid: data.IpfsHash, uri: `ipfs://${data.IpfsHash}`, url: buildIpfsGatewayUrl(gateway, data.IpfsHash, env.PINATA_GATEWAY_TOKEN) };
}

async function parsePinataV3Response(response: Response) {
  const body = (await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }))) as {
    data?: { cid?: string };
    error?: { reason?: string; details?: string; message?: string };
    message?: string;
    raw?: string;
  };
  if (!response.ok || !body.data?.cid) {
    const message = body.error?.details ?? body.error?.reason ?? body.error?.message ?? body.message ?? body.raw ?? response.statusText;
    if (response.status === 401 || response.status === 403 || /not authorized|unauthorized/i.test(message)) {
      throw new AppError(response.status || 401, "Pinata V3 upload is not authorized. PINATA_JWT must be an API JWT with org:files:write access; pinataGatewayToken is only for reading gateway files.");
    }
    throw new AppError(response.status || 502, `Pinata V3 upload failed: ${message}`);
  }
  const gateway = env.PINATA_GATEWAY_URL || env.PINATA_GATEWAY;
  return { cid: body.data.cid, uri: `ipfs://${body.data.cid}`, url: buildIpfsGatewayUrl(gateway, body.data.cid, env.PINATA_GATEWAY_TOKEN) };
}

export async function uploadJsonToIpfs(name: string, json: unknown) {
  return uploadBufferToIpfs(name, Buffer.from(JSON.stringify(json)), "application/json");
}

async function uploadBufferToPinataV3(name: string, buffer: Buffer, contentType: string) {
  assertPinataConfigured();
  const form = new FormData();
  form.append("network", env.PINATA_NETWORK);
  form.append("file", new Blob([buffer as unknown as BlobPart], { type: contentType }), name);
  form.append("name", name);
  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PINATA_JWT}`
    },
    body: form
  });
  return parsePinataV3Response(response);
}

async function uploadBufferToPinataLegacy(name: string, buffer: Buffer, contentType = "application/octet-stream") {
  assertPinataConfigured();
  const form = new FormData();
  form.append("file", new Blob([buffer as unknown as BlobPart], { type: contentType }), name);
  form.append("pinataMetadata", JSON.stringify({ name }));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PINATA_JWT}`
    },
    body: form
  });
  return parsePinataResponse(response);
}

export async function uploadBufferToIpfs(name: string, buffer: Buffer, contentType = "application/octet-stream") {
  if (env.PINATA_UPLOAD_MODE === "v3") return uploadBufferToPinataV3(name, buffer, contentType);
  if (env.PINATA_UPLOAD_MODE === "legacy") return uploadBufferToPinataLegacy(name, buffer, contentType);
  try {
    return await uploadBufferToPinataV3(name, buffer, contentType);
  } catch (v3Error) {
    const v3Message = v3Error instanceof Error ? v3Error.message : String(v3Error);
    if (/not authorized|unauthorized/i.test(v3Message)) throw v3Error;
    try {
      return await uploadBufferToPinataLegacy(name, buffer, contentType);
    } catch (legacyError) {
      const legacyMessage = legacyError instanceof Error ? legacyError.message : String(legacyError);
      throw new AppError(502, `${v3Message}; legacy fallback failed: ${legacyMessage}`);
    }
  }
}
