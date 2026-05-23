import { Types } from "mongoose";
import { AppError } from "../../middleware/error.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";

export type CollectionMetadataReadiness = {
  totalItems: number;
  metadataReady: number;
  failedItems: number;
  missingImageIpfs: number;
  missingMetadata: number;
  missingMetadataIpfs: number;
  metadataBaseUri?: string;
  expectedFirstTokenUri?: string;
  expectedLastTokenUri?: string;
  deployable: boolean;
  reason?: string;
};

export function normalizeMetadataBaseUri(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function isValidMetadataBaseUri(value?: string | null) {
  const normalized = normalizeMetadataBaseUri(value);
  return Boolean(normalized?.startsWith("ipfs://") && normalized.endsWith("/"));
}

function deployBlockReason(stats: CollectionMetadataReadiness, maxSupply: number) {
  if (!stats.metadataBaseUri) return "metadataBaseUri is missing.";
  if (!isValidMetadataBaseUri(stats.metadataBaseUri)) return "metadataBaseUri must start with ipfs:// and end with /.";
  if (maxSupply <= 0) return "maxSupply must be greater than 0.";
  if (stats.totalItems !== maxSupply) return `${stats.totalItems}/${maxSupply} NFT items exist.`;
  if (stats.metadataReady !== maxSupply) return `${stats.metadataReady}/${maxSupply} metadata files ready.`;
  if (stats.failedItems > 0) return `${stats.failedItems} failed item(s).`;
  if (stats.missingImageIpfs > 0) return `${stats.missingImageIpfs} item(s) missing image IPFS URI.`;
  if (stats.missingMetadata > 0) return `${stats.missingMetadata} item(s) missing metadata JSON.`;
  if (stats.missingMetadataIpfs > 0) return `${stats.missingMetadataIpfs} item(s) missing metadata IPFS URI.`;
  return undefined;
}

export async function assertCollectionMetadataReady(collectionId: string | Types.ObjectId): Promise<CollectionMetadataReadiness> {
  const collection = await NFTCollection.findById(collectionId).lean();
  if (!collection) throw new AppError(404, "Collection not found");

  const metadataBaseUri = normalizeMetadataBaseUri(collection.metadataBaseIpfsUri ?? collection.metadataBaseUri ?? collection.baseMetadataUri);
  const collectionObjectId = collection._id as Types.ObjectId;
  const [totalItems, metadataReady, failedItems, missingImageIpfs, missingMetadata, missingMetadataIpfs] = await Promise.all([
    NFTItem.countDocuments({ collectionId: collectionObjectId }),
    NFTItem.countDocuments({ collectionId: collectionObjectId, generationStatus: "metadata_ready" }),
    NFTItem.countDocuments({ collectionId: collectionObjectId, generationStatus: "failed" }),
    NFTItem.countDocuments({ collectionId: collectionObjectId, $or: [{ imageIpfsUri: { $exists: false } }, { imageIpfsUri: null }, { imageIpfsUri: "" }, { imageIpfsUri: { $not: /^ipfs:\/\// } }] }),
    NFTItem.countDocuments({ collectionId: collectionObjectId, $or: [{ metadata: { $exists: false } }, { metadata: null }] }),
    NFTItem.countDocuments({ collectionId: collectionObjectId, $or: [{ metadataIpfsUri: { $exists: false } }, { metadataIpfsUri: null }, { metadataIpfsUri: "" }, { metadataIpfsUri: { $not: /^ipfs:\/\// } }] })
  ]);

  const stats: CollectionMetadataReadiness = {
    totalItems,
    metadataReady,
    failedItems,
    missingImageIpfs,
    missingMetadata,
    missingMetadataIpfs,
    metadataBaseUri,
    expectedFirstTokenUri: metadataBaseUri ? `${metadataBaseUri}1.json` : undefined,
    expectedLastTokenUri: metadataBaseUri ? `${metadataBaseUri}${collection.maxSupply}.json` : undefined,
    deployable: false
  };
  const reason = deployBlockReason(stats, collection.maxSupply);
  stats.deployable = !reason;
  stats.reason = reason;
  return stats;
}

export async function requireCollectionDeployable(collectionId: string | Types.ObjectId) {
  const collection = await NFTCollection.findById(collectionId).lean();
  if (!collection) throw new AppError(404, "Collection not found");
  const stats = await assertCollectionMetadataReady(collectionId);
  if (collection.status !== "metadata_ready") {
    throw new AppError(400, `Collection is not deployable yet: status is ${collection.status}, expected metadata_ready.`);
  }
  if (collection.contractAddress || collection.deploymentStatus === "deployed") {
    throw new AppError(400, "Collection contract is already deployed.");
  }
  if (!stats.deployable) {
    throw new AppError(400, `Collection is not deployable yet: ${stats.reason}`);
  }
  return stats;
}

