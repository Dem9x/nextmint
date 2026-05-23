import { decodeEventLog, formatEther, getAddress, isAddress, parseAbi, type Hash } from "viem";
import { getMarketplaceContract } from "../../config/chains.config.js";
import { AppError } from "../../middleware/error.js";
import { MarketplaceActivity } from "../../models/MarketplaceActivity.js";
import { MarketplaceListing } from "../../models/MarketplaceListing.js";
import { MarketplaceTrade } from "../../models/MarketplaceTrade.js";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { getReceipt } from "../blockchain/tx-verifier.service.js";

export const marketplaceEventsAbi = parseAbi([
  "event ItemListed(address indexed nftContract,uint256 indexed tokenId,address indexed seller,uint256 price)",
  "event ItemSold(address indexed nftContract,uint256 indexed tokenId,address indexed seller,address buyer,uint256 price,uint256 platformFee)",
  "event ListingCancelled(address indexed nftContract,uint256 indexed tokenId,address indexed seller)"
]);

function sameAddress(a: string, b: string) {
  return getAddress(a).toLowerCase() === getAddress(b).toLowerCase();
}

async function findAssetLinks(chainId: number, nftContract: string, tokenId: string) {
  const [nftItem, collection] = await Promise.all([
    NFTItem.findOne({ chainId, contractAddress: nftContract.toLowerCase(), tokenId }).lean(),
    NFTCollection.findOne({ chainId, contractAddress: nftContract.toLowerCase() }).lean()
  ]);
  return {
    nftItemId: nftItem?._id,
    generationId: nftItem?.generationId,
    collectionId: collection?._id ?? nftItem?.collectionId
  };
}

export async function verifyMarketplaceTx(input: { chainId: number; txHash: Hash; expectedEvent: "listed" | "sold" | "cancelled" }) {
  const marketplace = getMarketplaceContract(input.chainId);
  if (!marketplace || !isAddress(marketplace)) throw new AppError(400, "Marketplace contract is not configured for this chain");
  const receipt = await getReceipt(input.chainId, input.txHash);
  if (receipt.status !== "success") throw new AppError(400, "Marketplace transaction failed on-chain");

  for (const log of receipt.logs) {
    if (!sameAddress(log.address, marketplace)) continue;
    try {
      const decoded = decodeEventLog({ abi: marketplaceEventsAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "ItemListed" && input.expectedEvent === "listed") {
        return handleListed(input.chainId, input.txHash, receipt.blockNumber ? Number(receipt.blockNumber) : undefined, decoded.args);
      }
      if (decoded.eventName === "ItemSold" && input.expectedEvent === "sold") {
        return handleSold(input.chainId, input.txHash, receipt.blockNumber ? Number(receipt.blockNumber) : undefined, decoded.args);
      }
      if (decoded.eventName === "ListingCancelled" && input.expectedEvent === "cancelled") {
        return handleCancelled(input.chainId, input.txHash, receipt.blockNumber ? Number(receipt.blockNumber) : undefined, decoded.args);
      }
    } catch {
      // Ignore non-marketplace logs from the same transaction.
    }
  }

  throw new AppError(400, `Marketplace ${input.expectedEvent} event not found`);
}

async function handleListed(chainId: number, txHash: Hash, blockNumber: number | undefined, args: { nftContract: string; tokenId: bigint; seller: string; price: bigint }) {
  const nftContract = args.nftContract.toLowerCase();
  const tokenId = args.tokenId.toString();
  const links = await findAssetLinks(chainId, nftContract, tokenId);
  const listing = await MarketplaceListing.findOneAndUpdate(
    { chainId, nftContract, tokenId, status: "active" },
    {
      chainId,
      nftContract,
      tokenId,
      seller: args.seller.toLowerCase(),
      price: args.price.toString(),
      currency: "ETH",
      status: "active",
      listTxHash: txHash.toLowerCase(),
      listedAt: new Date(),
      blockNumber,
      ...links
    },
    { upsert: true, new: true }
  );
  await MarketplaceActivity.create({
    type: "listed",
    chainId,
    nftContract,
    tokenId,
    wallet: args.seller.toLowerCase(),
    price: args.price.toString(),
    currency: "ETH",
    txHash: txHash.toLowerCase(),
    blockNumber,
    ...links
  });
  return { listing };
}

async function handleSold(chainId: number, txHash: Hash, blockNumber: number | undefined, args: { nftContract: string; tokenId: bigint; seller: string; buyer: string; price: bigint; platformFee: bigint }) {
  const nftContract = args.nftContract.toLowerCase();
  const tokenId = args.tokenId.toString();
  const links = await findAssetLinks(chainId, nftContract, tokenId);
  const listing = await MarketplaceListing.findOneAndUpdate(
    { chainId, nftContract, tokenId, status: "active" },
    { status: "sold", saleTxHash: txHash.toLowerCase(), soldAt: new Date(), blockNumber, ...links },
    { new: true }
  );
  const trade = await MarketplaceTrade.findOneAndUpdate(
    { txHash: txHash.toLowerCase() },
    {
      chainId,
      nftContract,
      tokenId,
      seller: args.seller.toLowerCase(),
      buyer: args.buyer.toLowerCase(),
      price: args.price.toString(),
      currency: "ETH",
      platformFee: args.platformFee.toString(),
      txHash: txHash.toLowerCase(),
      blockNumber,
      timestamp: new Date(),
      ...links
    },
    { upsert: true, new: true }
  );
  await MarketplaceActivity.create({
    type: "sold",
    chainId,
    nftContract,
    tokenId,
    wallet: args.buyer.toLowerCase(),
    counterparty: args.seller.toLowerCase(),
    price: args.price.toString(),
    currency: "ETH",
    txHash: txHash.toLowerCase(),
    blockNumber,
    ...links
  });
  await NFTItem.findOneAndUpdate(
    { chainId, contractAddress: nftContract, tokenId },
    { ownerWallet: args.buyer.toLowerCase(), mintStatus: "minted" }
  );
  return { listing, trade, priceEth: formatEther(args.price) };
}

async function handleCancelled(chainId: number, txHash: Hash, blockNumber: number | undefined, args: { nftContract: string; tokenId: bigint; seller: string }) {
  const nftContract = args.nftContract.toLowerCase();
  const tokenId = args.tokenId.toString();
  const links = await findAssetLinks(chainId, nftContract, tokenId);
  const listing = await MarketplaceListing.findOneAndUpdate(
    { chainId, nftContract, tokenId, status: "active" },
    { status: "cancelled", cancelTxHash: txHash.toLowerCase(), cancelledAt: new Date(), blockNumber, ...links },
    { new: true }
  );
  await MarketplaceActivity.create({
    type: "cancelled",
    chainId,
    nftContract,
    tokenId,
    wallet: args.seller.toLowerCase(),
    txHash: txHash.toLowerCase(),
    blockNumber,
    ...links
  });
  return { listing };
}
