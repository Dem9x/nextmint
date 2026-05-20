import { decodeEventLog, getAddress, isAddress, parseAbi, type Hash } from "viem";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { Generation } from "../models/Generation.js";
import { NFTItem } from "../models/NFTItem.js";
import { User } from "../models/User.js";
import { getChainConfig, getExplorerTxUrl } from "../config/chains.config.js";
import { getGatewayUrl, uploadImageFromUrl, uploadJson } from "../services/ipfs/ipfs.service.js";
import { createERC721Metadata } from "../services/nft/metadata.service.js";
import { getReceipt, waitForConfirmations } from "../services/blockchain/tx-verifier.service.js";
import { getPublicClient } from "../services/blockchain/rpc-client.service.js";
import { assertErc721MintOwnership } from "../services/blockchain/erc721-verifier.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const transferAbi = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);

const prepareSchema = z.object({
  generationId: z.string(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  collectionId: z.string().optional(),
  attributes: z.array(z.object({
    trait_type: z.string().trim().min(1).max(80),
    value: z.union([z.string().trim().min(1).max(200), z.number()]),
    display_type: z.string().trim().max(80).optional()
  })).optional()
});

const verifySchema = z.object({
  nftItemId: z.string(),
  chainId: z.number().int(),
  contractAddress: z.string(),
  txHash: z.custom<Hash>(),
  mintValue: z.string().regex(/^\d+$/).optional()
});

function sameAddress(a: string, b: string) {
  return getAddress(a).toLowerCase() === getAddress(b).toLowerCase();
}

export const prepareFromGeneration = asyncHandler(async (req: AuthRequest, res) => {
  const body = prepareSchema.parse(req.body);
  const generation = await Generation.findOne({ _id: body.generationId, user: req.user!.id });
  if (!generation) throw new AppError(404, "Generation not found");
  if (!generation.imageUrl) throw new AppError(400, "Generation does not have an image to prepare");

  generation.status = "uploading_image_ipfs";
  generation.progress = 76;
  await generation.save();

  const imageUpload = await uploadImageFromUrl(generation.imageUrl);
  generation.imageIpfsUri = imageUpload.ipfsUri;
  generation.status = "generating_metadata";
  generation.progress = 84;
  await generation.save();

  const metadata = createERC721Metadata({
    name: body.name,
    description: body.description,
    imageIpfsUri: imageUpload.ipfsUri,
    attributes: body.attributes,
    externalUrl: process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/nft/${body.generationId}` : undefined
  });

  generation.status = "uploading_metadata_ipfs";
  generation.progress = 90;
  await generation.save();

  const metadataUpload = await uploadJson(metadata);
  const user = await User.findById(req.user!.id).lean();
  const nftItem = await NFTItem.create({
    userId: req.user!.id,
    owner: req.user!.id,
    collectionId: body.collectionId,
    collection: body.collectionId,
    generationId: generation._id,
    name: body.name,
    description: body.description,
    imageUrl: generation.imageUrl,
    imageIpfsUri: imageUpload.ipfsUri,
    metadataIpfsUri: metadataUpload.ipfsUri,
    metadataGatewayUrl: metadataUpload.gatewayUrl,
    attributes: body.attributes ?? [],
    metadata,
    mintStatus: "ready_to_mint",
    ownerWallet: user?.primaryWalletAddress
  });

  generation.metadataIpfsUri = metadataUpload.ipfsUri;
  generation.set("nftItem", nftItem._id);
  generation.status = "ready_to_mint";
  generation.progress = 95;
  await generation.save();

  res.status(201).json({
    nftItemId: String(nftItem._id),
    status: "ready_to_mint",
    imageIpfsUri: imageUpload.ipfsUri,
    metadataIpfsUri: metadataUpload.ipfsUri,
    metadataGatewayUrl: metadataUpload.gatewayUrl,
    nftItem
  });
});

export const verifyMint = asyncHandler(async (req: AuthRequest, res) => {
  const body = verifySchema.parse(req.body);
  if (!isAddress(body.contractAddress)) throw new AppError(400, "Invalid contract address");
  const chain = getChainConfig(body.chainId);
  if (!chain) throw new AppError(400, "Unsupported chain");
  const nftItem = await NFTItem.findOne({ _id: body.nftItemId, userId: req.user!.id });
  if (!nftItem) throw new AppError(404, "NFT item not found");
  if (!nftItem.metadataIpfsUri) throw new AppError(400, "NFT metadata is not ready");

  const user = await User.findById(req.user!.id).lean();
  const expectedReceiver = user?.primaryWalletAddress ?? nftItem.ownerWallet;
  if (!expectedReceiver || !isAddress(expectedReceiver)) throw new AppError(400, "Wallet login is required before mint verification");

  nftItem.mintStatus = "minting";
  nftItem.chainId = body.chainId;
  nftItem.contractAddress = body.contractAddress.toLowerCase();
  await nftItem.save();
  await Generation.findByIdAndUpdate(nftItem.generationId, { status: "minting", progress: 98 });

  const receipt = await getReceipt(body.chainId, body.txHash);
  const tx = await getPublicClient(body.chainId).getTransaction({ hash: body.txHash });
  if (!receipt.to || !sameAddress(receipt.to, body.contractAddress)) throw new AppError(400, "Mint transaction was sent to a different contract");
  if (!sameAddress(tx.from, expectedReceiver)) throw new AppError(400, "Mint transaction sender mismatch");
  if (body.mintValue && tx.value < BigInt(body.mintValue)) throw new AppError(400, "Mint payment amount is lower than expected");
  if (receipt.status !== "success") throw new AppError(400, "Mint transaction failed on-chain");
  const { confirmations } = await waitForConfirmations({ chainId: body.chainId, txHash: body.txHash });
  void confirmations;

  const transfer = receipt.logs.find((log) => {
    if (!sameAddress(log.address, body.contractAddress)) return false;
    try {
      const decoded = decodeEventLog({ abi: transferAbi, data: log.data, topics: log.topics });
      return decoded.eventName === "Transfer" && sameAddress(decoded.args.to, expectedReceiver);
    } catch {
      return false;
    }
  });
  if (!transfer) throw new AppError(400, "Mint Transfer event not found for wallet");
  const decoded = decodeEventLog({ abi: transferAbi, data: transfer.data, topics: transfer.topics });
  const tokenId = decoded.args.tokenId.toString();
  const onchain = await assertErc721MintOwnership({
    chainId: body.chainId,
    contractAddress: body.contractAddress,
    owner: expectedReceiver,
    tokenId,
    expectedTokenUri: nftItem.metadataIpfsUri
  });

  nftItem.chainId = body.chainId;
  nftItem.contractAddress = body.contractAddress.toLowerCase();
  nftItem.tokenId = tokenId;
  nftItem.mintTxHash = body.txHash.toLowerCase();
  nftItem.mintStatus = "minted";
  nftItem.ownerWallet = expectedReceiver.toLowerCase();
  await nftItem.save();
  await Generation.findByIdAndUpdate(nftItem.generationId, { status: "minted", progress: 100 });

  res.json({
    status: "minted",
    tokenId,
    txHash: body.txHash,
    chainId: body.chainId,
    contractAddress: body.contractAddress,
    tokenUri: onchain.tokenUri,
    explorerUrl: getExplorerTxUrl(body.chainId, body.txHash)
  });
});

export const getNftItem = asyncHandler(async (req: AuthRequest, res) => {
  const nftItem = await NFTItem.findById(req.params.id).lean();
  if (!nftItem) throw new AppError(404, "NFT item not found");
  const isOwner = req.user?.id && String(nftItem.userId) === req.user.id;
  if (nftItem.mintStatus !== "minted" && !isOwner) throw new AppError(404, "NFT item not found");
  const chain = nftItem.chainId ? getChainConfig(nftItem.chainId) : undefined;
  const explorerTxUrl = chain && nftItem.mintTxHash ? `${chain.explorerUrl}/tx/${nftItem.mintTxHash}` : undefined;
  const explorerTokenUrl = chain && nftItem.contractAddress && nftItem.tokenId
    ? `${chain.explorerUrl}/token/${nftItem.contractAddress}?a=${nftItem.tokenId}`
    : undefined;
  const imageGatewayUrl = nftItem.imageIpfsUri ? getGatewayUrl(nftItem.imageIpfsUri) : undefined;
  const metadataGatewayUrl = nftItem.metadataIpfsUri ? getGatewayUrl(nftItem.metadataIpfsUri) : nftItem.metadataGatewayUrl;
  res.json({
    id: String(nftItem._id),
    name: nftItem.name,
    description: nftItem.description,
    imageUrl: imageGatewayUrl ?? nftItem.imageUrl,
    imageGatewayUrl,
    imageIpfsUri: nftItem.imageIpfsUri,
    metadataIpfsUri: nftItem.metadataIpfsUri,
    metadataGatewayUrl,
    attributes: nftItem.attributes ?? [],
    chainId: nftItem.chainId,
    chainName: chain?.name,
    contractAddress: nftItem.contractAddress,
    tokenId: nftItem.tokenId,
    mintTxHash: nftItem.mintTxHash,
    ownerWallet: nftItem.ownerWallet,
    mintStatus: nftItem.mintStatus,
    explorerTxUrl,
    explorerTokenUrl,
    createdAt: nftItem.createdAt,
    updatedAt: nftItem.updatedAt
  });
});

export const revalidateMint = asyncHandler(async (req: AuthRequest, res) => {
  const nftItem = await NFTItem.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!nftItem) throw new AppError(404, "NFT item not found");
  if (!nftItem.chainId || !nftItem.contractAddress || !nftItem.tokenId || !nftItem.ownerWallet) {
    throw new AppError(400, "NFT item does not have complete mint data");
  }
  try {
    const onchain = await assertErc721MintOwnership({
      chainId: nftItem.chainId,
      contractAddress: nftItem.contractAddress,
      owner: nftItem.ownerWallet,
      tokenId: nftItem.tokenId,
      expectedTokenUri: nftItem.metadataIpfsUri ?? undefined
    });
    nftItem.mintStatus = "minted";
    await nftItem.save();
    res.json({ status: "minted", tokenId: nftItem.tokenId, owner: onchain.owner, tokenUri: onchain.tokenUri });
  } catch (error) {
    nftItem.mintStatus = "failed";
    await nftItem.save();
    throw error;
  }
});
