import { isAddress, parseAbi } from "viem";
import { logger } from "../../config/logger.js";
import { Generation } from "../../models/Generation.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { User } from "../../models/User.js";
import { getPublicClient } from "../blockchain/rpc-client.service.js";
import { buildCollectionBadgeState } from "../creators/public-creator.service.js";
import { ipfsToGatewayUrl, isIpfsUri, normalizeIpfsUri } from "../ipfs/ipfs-url.service.js";

const tokenUriAbi = parseAbi(["function tokenURI(uint256 tokenId) view returns (string)"]);

type ResolvedMarketplaceAsset = {
  chainId: number;
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageIpfsUri?: string;
  metadataIpfsUri?: string;
  metadataGatewayUrl?: string;
  attributes?: Array<any>;
  collectionId?: string;
  collectionName?: string;
  collectionSlug?: string;
  generationId?: string;
  nftItemId?: string;
  ownerWallet?: string;
  metadata?: any;
  creatorProfile?: any;
  isVerifiedCollection?: boolean;
  collectionBadge?: string;
  isVerifiedCreator?: boolean;
  isProCreator?: boolean;
  source: "nft_item" | "generation" | "token_uri" | "unknown";
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metadataImage(metadata: any) {
  return stringValue(metadata?.image) ?? stringValue(metadata?.image_url) ?? stringValue(metadata?.imageUrl);
}

function gatewayFromIpfs(uri?: string) {
  return uri && isIpfsUri(uri) ? ipfsToGatewayUrl(uri) : undefined;
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Metadata fetch failed: ${response.status}`);
  return response.json();
}

async function fetchMetadataFromIpfs(uri?: string) {
  if (!uri) return undefined;
  try {
    return await fetchJson(isIpfsUri(uri) ? ipfsToGatewayUrl(uri) : uri);
  } catch (error) {
    logger.warn({ err: error, uri }, "marketplace metadata fetch failed");
    return undefined;
  }
}

function withImageFallback<T extends ResolvedMarketplaceAsset>(asset: T) {
  const metadataImageUri = metadataImage(asset.metadata);
  const normalizedImageIpfs = asset.imageIpfsUri ?? (metadataImageUri ? normalizeIpfsUri(metadataImageUri) : undefined);
  const imageUrl = asset.imageUrl ?? gatewayFromIpfs(normalizedImageIpfs) ?? (metadataImageUri && !isIpfsUri(metadataImageUri) ? metadataImageUri : undefined);
  return {
    ...asset,
    imageIpfsUri: normalizedImageIpfs?.startsWith("ipfs://") ? normalizedImageIpfs : asset.imageIpfsUri,
    imageUrl
  };
}

async function fromNftItem(input: { chainId: number; contractAddress: string; tokenId: string }): Promise<ResolvedMarketplaceAsset | undefined> {
  const tokenNumber = Number(input.tokenId);
  const item = await NFTItem.findOne({
    $or: [
      { chainId: input.chainId, contractAddress: input.contractAddress, tokenId: input.tokenId },
      ...(Number.isFinite(tokenNumber) ? [{ chainId: input.chainId, contractAddress: input.contractAddress, tokenNumber }] : [])
    ]
  }).populate("collectionId", "name slug owner creatorId isVerifiedCollection collectionBadge").lean();

  if (!item) return undefined;
  const collection = typeof item.collectionId === "object" ? item.collectionId as any : undefined;
  const creatorId = collection?.creatorId ?? collection?.owner;
  const creator = creatorId
    ? await User.findById(creatorId)
      .select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge")
      .lean()
    : undefined;
  const badges = buildCollectionBadgeState(collection, creator);
  const metadata = item.metadata ?? await fetchMetadataFromIpfs(stringValue(item.metadataIpfsUri));
  return withImageFallback({
    chainId: input.chainId,
    contractAddress: input.contractAddress,
    tokenId: item.tokenId ?? input.tokenId,
    name: item.name ?? `Token #${input.tokenId}`,
    description: stringValue(item.description),
    imageUrl: stringValue(item.imageUrl),
    imageIpfsUri: stringValue(item.imageIpfsUri),
    metadataIpfsUri: stringValue(item.metadataIpfsUri),
    metadataGatewayUrl: stringValue(item.metadataGatewayUrl) ?? (item.metadataIpfsUri ? gatewayFromIpfs(item.metadataIpfsUri) : undefined),
    attributes: (item.attributes?.length ? item.attributes : item.traits?.length ? item.traits : metadata?.attributes) ?? [],
    collectionId: collection?._id ? String(collection._id) : item.collection ? String(item.collection) : undefined,
    collectionName: collection?.name,
    collectionSlug: collection?.slug,
    generationId: item.generationId ? String(item.generationId) : undefined,
    nftItemId: String(item._id),
    ownerWallet: stringValue(item.ownerWallet),
    metadata,
    ...badges,
    source: "nft_item" as const
  });
}

async function fromGeneration(input: { chainId: number; contractAddress: string; tokenId: string }): Promise<ResolvedMarketplaceAsset | undefined> {
  const generation = await Generation.findOne({
    $or: [
      {
        "output.mint.chainId": input.chainId,
        "output.mint.contractAddress": input.contractAddress,
        "output.mint.tokenId": input.tokenId
      },
      {
        chainId: input.chainId,
        contractAddress: input.contractAddress,
        tokenId: input.tokenId
      }
    ]
  }).lean();

  if (!generation) return undefined;
  const generationAny = generation as any;
  const creatorId = generationAny.userId ?? generationAny.user;
  const creator = creatorId
    ? await User.findById(creatorId)
      .select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge")
      .lean()
    : undefined;
  const output = generation.output as any;
  const metadataIpfsUri = generation.metadataIpfsUri ?? stringValue(output?.metadataIpfsUri) ?? stringValue(output?.mint?.metadataIpfsUri);
  const metadata = output?.metadata ?? output?.image?.metadata ?? await fetchMetadataFromIpfs(metadataIpfsUri);
  const name = stringValue(metadata?.name) ?? `Token #${input.tokenId}`;
  const description = stringValue(metadata?.description) ?? generation.metadataDescription ?? generation.enhancedPrompt ?? generation.prompt;
  return withImageFallback({
    chainId: input.chainId,
    contractAddress: input.contractAddress,
    tokenId: input.tokenId,
    name,
    description,
    imageUrl: generation.imageUrl ?? stringValue(output?.image?.gatewayUrl),
    imageIpfsUri: generation.imageIpfsUri ?? stringValue(output?.image?.imageIpfsUri),
    metadataIpfsUri,
    metadataGatewayUrl: metadataIpfsUri ? gatewayFromIpfs(metadataIpfsUri) : undefined,
    attributes: metadata?.attributes ?? [],
    generationId: String(generation._id),
    ownerWallet: stringValue(output?.mint?.ownerWallet),
    metadata,
    ...buildCollectionBadgeState(undefined, creator),
    source: "generation" as const
  });
}

async function fromTokenUri(input: { chainId: number; contractAddress: string; tokenId: string }): Promise<ResolvedMarketplaceAsset | undefined> {
  try {
    if (!isAddress(input.contractAddress)) return undefined;
    const client = getPublicClient(input.chainId);
    const tokenUri = await client.readContract({
      address: input.contractAddress as `0x${string}`,
      abi: tokenUriAbi,
      functionName: "tokenURI",
      args: [BigInt(input.tokenId)]
    });
    const metadataIpfsUri = normalizeIpfsUri(tokenUri);
    const metadataGatewayUrl = isIpfsUri(metadataIpfsUri) ? ipfsToGatewayUrl(metadataIpfsUri) : metadataIpfsUri;
    const metadata = await fetchJson(metadataGatewayUrl);
    const imageUri = metadataImage(metadata);
    const imageIpfsUri = imageUri ? normalizeIpfsUri(imageUri) : undefined;

    return withImageFallback({
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      tokenId: input.tokenId,
      name: stringValue(metadata?.name) ?? `Token #${input.tokenId}`,
      description: stringValue(metadata?.description),
      imageIpfsUri: imageIpfsUri?.startsWith("ipfs://") ? imageIpfsUri : undefined,
      imageUrl: imageIpfsUri?.startsWith("ipfs://") ? ipfsToGatewayUrl(imageIpfsUri) : imageUri,
      metadataIpfsUri: metadataIpfsUri.startsWith("ipfs://") ? metadataIpfsUri : undefined,
      metadataGatewayUrl,
      attributes: metadata?.attributes ?? [],
      metadata,
      source: "token_uri" as const
    });
  } catch (error) {
    logger.warn({ err: error, chainId: input.chainId, contractAddress: input.contractAddress, tokenId: input.tokenId }, "marketplace tokenURI fallback failed");
    return undefined;
  }
}

export async function resolveMarketplaceAsset(input: { chainId: number; contractAddress: string; tokenId: string }): Promise<ResolvedMarketplaceAsset> {
  const normalized = {
    chainId: input.chainId,
    contractAddress: input.contractAddress.toLowerCase(),
    tokenId: String(input.tokenId)
  };

  const collection = await NFTCollection.findOne({ chainId: normalized.chainId, contractAddress: normalized.contractAddress })
    .select("_id name slug owner creatorId isVerifiedCollection collectionBadge")
    .lean();
  const unknownAsset: ResolvedMarketplaceAsset = {
    chainId: normalized.chainId,
    contractAddress: normalized.contractAddress,
    tokenId: normalized.tokenId,
    name: `Token #${normalized.tokenId}`,
    source: "unknown"
  };
  const asset: ResolvedMarketplaceAsset = await fromNftItem(normalized)
    ?? await fromGeneration(normalized)
    ?? await fromTokenUri(normalized)
    ?? unknownAsset;

  const creatorId = collection?.creatorId ?? collection?.owner;
  const creator = creatorId
    ? await User.findById(creatorId)
      .select("displayName username avatarUrl walletAddress primaryWallet primaryWalletAddress currentPlan plan isVerifiedCreator creatorBadge")
      .lean()
    : undefined;
  const collectionBadges = collection ? buildCollectionBadgeState(collection, creator) : undefined;
  const resolved = collection && !asset.collectionId
    ? { ...asset, collectionId: String(collection._id), collectionName: collection.name, collectionSlug: collection.slug, ...collectionBadges }
    : collectionBadges && !asset.creatorProfile
      ? { ...asset, ...collectionBadges }
    : asset;

  logger.info({
    chainId: resolved.chainId,
    contractAddress: resolved.contractAddress,
    tokenId: resolved.tokenId,
    source: resolved.source,
    hasImageUrl: Boolean(resolved.imageUrl),
    hasImageIpfsUri: Boolean(resolved.imageIpfsUri),
    hasMetadataIpfsUri: Boolean(resolved.metadataIpfsUri)
  }, "marketplace asset resolved");

  return resolved;
}
