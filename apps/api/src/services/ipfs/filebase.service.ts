import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../middleware/error.js";
import { buildIpfsGatewayUrl } from "./gateway-url.js";

type FilebaseUploadResult = {
  ipfsUri: string;
  ipfsHash: string;
  gatewayUrl: string;
  key: string;
};

function assertFilebaseConfigured() {
  if (!env.FILEBASE_ACCESS_KEY || !env.FILEBASE_SECRET_KEY || !env.FILEBASE_BUCKET) {
    throw new AppError(500, "Filebase is not configured. Set FILEBASE_ACCESS_KEY, FILEBASE_SECRET_KEY, and FILEBASE_BUCKET.");
  }
}

function filebaseClient() {
  assertFilebaseConfigured();
  return new S3Client({
    endpoint: env.FILEBASE_S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.FILEBASE_ACCESS_KEY!,
      secretAccessKey: env.FILEBASE_SECRET_KEY!
    }
  });
}

function contentTypeExtension(contentType: string) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  return "png";
}

function extractCidFromMetadata(metadata?: Record<string, string>) {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata);
  const found = entries.find(([key]) => {
    const lower = key.toLowerCase();
    return lower === "cid" || lower === "ipfs-cid" || lower === "ipfs_hash" || lower === "ipfshash";
  });
  return found?.[1];
}

async function resolveFilebaseCid(client: S3Client, key: string, putResponseMetadata?: Record<string, string>) {
  const putCid = extractCidFromMetadata(putResponseMetadata);
  if (putCid) return putCid;

  const head = await client.send(new HeadObjectCommand({ Bucket: env.FILEBASE_BUCKET!, Key: key }));
  const headCid = extractCidFromMetadata(head.Metadata);
  if (headCid) return headCid;

  logger.warn(
    {
      key,
      putMetadataKeys: Object.keys(putResponseMetadata ?? {}),
      headMetadataKeys: Object.keys(head.Metadata ?? {}),
      requestId: head.$metadata.requestId,
      httpStatusCode: head.$metadata.httpStatusCode
    },
    "Filebase upload completed without an IPFS CID in response metadata"
  );
  throw new AppError(502, "Filebase upload completed but IPFS CID was not returned");
}

export async function uploadBufferToFilebase(input: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<FilebaseUploadResult> {
  const client = filebaseClient();
  const key = input.key.replace(/^\/+/, "");
  logger.info({ key, contentType: input.contentType, size: input.buffer.length }, "Filebase upload started");

  const response = await client.send(new PutObjectCommand({
    Bucket: env.FILEBASE_BUCKET!,
    Key: key,
    Body: input.buffer,
    ContentType: input.contentType,
    Metadata: {
      source: "nexmint-ai"
    }
  }));
  const cid = await resolveFilebaseCid(client, key, (response as { Metadata?: Record<string, string> }).Metadata);
  const ipfsUri = `ipfs://${cid}`;
  const gatewayUrl = buildIpfsGatewayUrl(env.FILEBASE_GATEWAY, cid);
  logger.info({ key, cid, gatewayUrl }, "Filebase upload succeeded");
  return { ipfsUri, ipfsHash: cid, gatewayUrl, key };
}

export async function uploadImageUrlToFilebase(input: {
  imageUrl: string;
  key: string;
}): Promise<FilebaseUploadResult> {
  logger.info({ imageUrlHost: new URL(input.imageUrl).host, key: input.key }, "Image provider URL received for Filebase persistence");
  const response = await fetch(input.imageUrl);
  if (!response.ok) {
    throw new AppError(response.status, `Filebase/IPFS upload failed: unable to fetch generated image (${response.statusText})`);
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) throw new AppError(400, "Filebase/IPFS upload failed: generated URL did not return an image");
  const extension = contentTypeExtension(contentType);
  const key = input.key.includes(".") ? input.key : `${input.key}.${extension}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadBufferToFilebase({ buffer, key, contentType });
}
