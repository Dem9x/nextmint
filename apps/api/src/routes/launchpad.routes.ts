import { Router } from "express";
import { decodeEventLog, formatEther, getAddress, isAddress, parseAbi, type Hash } from "viem";
import { z } from "zod";
import { NFTCollection } from "../models/NFTCollection.js";
import { MintCampaign } from "../models/MintCampaign.js";
import { MintRecord } from "../models/MintRecord.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/error.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { getExplorerTxUrl } from "../config/chains.config.js";
import { getReceipt, waitForConfirmations } from "../services/blockchain/tx-verifier.service.js";
import { getPublicClient } from "../services/blockchain/rpc-client.service.js";
import { assertErc721MintOwnership } from "../services/blockchain/erc721-verifier.service.js";
import { getTokenPrice } from "../pricing/services/crypto-pricing.service.js";
import { recordMintRevenue } from "../services/revenue/revenue-split.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const launchpadRouter = Router();

const launchpadAbi = parseAbi([
  "event PublicMinted(address indexed minter,uint256 quantity,uint256 totalPaid)",
  "event RevenueSplit(address indexed creator,address indexed treasury,uint256 creatorAmount,uint256 platformFee)",
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
]);

function sameAddress(a: string, b: string) {
  return getAddress(a).toLowerCase() === getAddress(b).toLowerCase();
}

function currentPublicStatus(collection: any) {
  const now = Date.now();
  const totalMinted = collection.totalMinted ?? collection.mintedSupply ?? 0;
  if (totalMinted >= collection.maxSupply) return "sold_out";
  if (collection.isPaused) return "paused";
  if (collection.publicMintEndAt && collection.publicMintEndAt.getTime() < now) return "minting_ended";
  if (collection.publicMintStartAt && collection.publicMintStartAt.getTime() <= now) return "minting_live";
  return "published";
}

launchpadRouter.get("/collections", asyncHandler(async (_req, res) => {
  const collections = await NFTCollection.find({
    status: { $in: ["published", "minting_live", "sold_out"] },
    isPublicMintEnabled: true,
    contractAddress: { $type: "string" },
    chainId: { $type: "number" },
    $or: [{ metadataBaseUri: { $type: "string" } }, { baseMetadataUri: { $type: "string" } }],
    publishFeeStatus: "verified"
  }).sort({ launchAt: -1, publicMintStartAt: 1 }).limit(100).lean();
  res.json({ collections });
}));

launchpadRouter.get("/collections/:slug", asyncHandler(async (req, res) => {
  const collection = await NFTCollection.findOne({ slug: req.params.slug }).lean();
  if (!collection) throw new AppError(404, "Collection not found");
  if (!["published", "minting_live", "sold_out"].includes(collection.status) || collection.publishFeeStatus !== "verified") {
    throw new AppError(404, "Published collection not found");
  }
  const campaign = await MintCampaign.findOne({ collectionId: collection._id }).lean();
  res.json({ collection: { ...collection, liveStatus: currentPublicStatus(collection) }, campaign });
}));

launchpadRouter.post("/collections/:id/verify-mint", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    chainId: z.number().int(),
    txHash: z.custom<Hash>(),
    minterWallet: z.string()
  }).parse(req.body);
  if (!isAddress(body.minterWallet)) throw new AppError(400, "Invalid minter wallet");
  const collection = await NFTCollection.findById(req.params.id);
  if (!collection) throw new AppError(404, "Collection not found");
  if (!collection.contractAddress || !collection.chainId) throw new AppError(400, "Collection contract missing");
  if (collection.chainId !== body.chainId) throw new AppError(400, "Mint chain mismatch");

  const receipt = await getReceipt(body.chainId, body.txHash);
  const tx = await getPublicClient(body.chainId).getTransaction({ hash: body.txHash });
  if (receipt.status !== "success") throw new AppError(400, "Mint transaction failed on-chain");
  if (!sameAddress(tx.from, body.minterWallet)) throw new AppError(400, "Mint transaction sender mismatch");
  if (!receipt.to || !sameAddress(receipt.to, collection.contractAddress)) throw new AppError(400, "Mint transaction sent to wrong contract");
  const { confirmations } = await waitForConfirmations({ chainId: body.chainId, txHash: body.txHash });

  const transferTokenIds: string[] = [];
  let publicMintEvent: { quantity: bigint; totalPaid: bigint; minter: string } | undefined;
  let splitEvent: { creatorAmount: bigint; platformFee: bigint } | undefined;

  for (const log of receipt.logs) {
    if (!sameAddress(log.address, collection.contractAddress)) continue;
    try {
      const decoded = decodeEventLog({ abi: launchpadAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "Transfer" && sameAddress(decoded.args.to, body.minterWallet)) {
        transferTokenIds.push(decoded.args.tokenId.toString());
      }
      if (decoded.eventName === "PublicMinted" && sameAddress(decoded.args.minter, body.minterWallet)) {
        publicMintEvent = { quantity: decoded.args.quantity, totalPaid: decoded.args.totalPaid, minter: decoded.args.minter };
      }
      if (decoded.eventName === "RevenueSplit") {
        splitEvent = { creatorAmount: decoded.args.creatorAmount, platformFee: decoded.args.platformFee };
      }
    } catch {
      // ignore non-launchpad logs
    }
  }

  if (!publicMintEvent) throw new AppError(400, "PublicMinted event not found for wallet");
  if (!transferTokenIds.length) throw new AppError(400, "Mint Transfer event not found for wallet");
  const quantity = Number(publicMintEvent.quantity);
  if (quantity !== transferTokenIds.length) throw new AppError(400, "Mint quantity and Transfer events mismatch");
  if (tx.value < publicMintEvent.totalPaid) throw new AppError(400, "Mint payment amount is lower than emitted payment");
  for (const tokenId of transferTokenIds) {
    await assertErc721MintOwnership({
      chainId: body.chainId,
      contractAddress: collection.contractAddress,
      owner: body.minterWallet,
      tokenId
    });
  }

  const price = await getTokenPrice(collection.mintCurrency ?? "ETH", body.chainId, { allowCache: true }).catch(() => undefined);
  const grossToken = formatEther(publicMintEvent.totalPaid);
  const platformToken = formatEther(splitEvent?.platformFee ?? 0n);
  const creatorToken = formatEther(splitEvent?.creatorAmount ?? publicMintEvent.totalPaid);
  const grossUsd = price ? Number(grossToken) * price.priceUsd : undefined;
  const platformUsd = price ? Number(platformToken) * price.priceUsd : undefined;
  const creatorUsd = price ? Number(creatorToken) * price.priceUsd : undefined;
  const user = await User.findById(req.user!.id).lean();

  const mintRecord = await MintRecord.findOneAndUpdate(
    { chainId: body.chainId, txHash: body.txHash.toLowerCase() },
    {
      collectionId: collection._id,
      userId: user?._id,
      minterWallet: body.minterWallet.toLowerCase(),
      chainId: body.chainId,
      contractAddress: collection.contractAddress.toLowerCase(),
      txHash: body.txHash.toLowerCase(),
      tokenIds: transferTokenIds,
      quantity,
      grossAmountToken: grossToken,
      grossAmountUsd: grossUsd,
      platformFeeToken: platformToken,
      platformFeeUsd: platformUsd,
      creatorAmountToken: creatorToken,
      creatorAmountUsd: creatorUsd,
      token: collection.mintCurrency ?? "ETH",
      status: "confirmed",
      blockNumber: receipt.blockNumber?.toString()
    },
    { upsert: true, new: true }
  );

  const totalMinted = Math.min((collection.totalMinted ?? collection.mintedSupply ?? 0) + quantity, collection.maxSupply);
  collection.totalMinted = totalMinted;
  collection.mintedSupply = totalMinted;
  collection.status = totalMinted >= collection.maxSupply ? "sold_out" : currentPublicStatus(collection);
  await collection.save();
  await MintCampaign.findOneAndUpdate({ collectionId: collection._id }, { totalMinted, status: collection.status === "sold_out" ? "sold_out" : collection.status === "minting_live" ? "live" : "scheduled" });
  await recordMintRevenue({
    creatorId: String(collection.creatorId ?? collection.owner),
    collectionId: String(collection._id),
    chainId: body.chainId,
    txHash: body.txHash,
    token: collection.mintCurrency ?? "ETH",
    grossAmountToken: grossToken,
    platformFeeToken: platformToken,
    creatorAmountToken: creatorToken,
    grossAmountUsd: grossUsd,
    platformFeeUsd: platformUsd,
    creatorAmountUsd: creatorUsd
  });

  res.json({
    mintRecord,
    tokenIds: transferTokenIds,
    quantity,
    totalMinted,
    txHash: body.txHash,
    confirmations,
    explorerUrl: getExplorerTxUrl(body.chainId, body.txHash)
  });
}));
