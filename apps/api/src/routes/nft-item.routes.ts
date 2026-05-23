import { Router } from "express";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { NFTItem } from "../models/NFTItem.js";
import { NFTLike } from "../models/NFTLike.js";
import { refreshNFTTrendingScore } from "../services/discovery/trending.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const nftItemRouter = Router();

function walletFor(req: AuthRequest) {
  const wallet = req.user?.walletAddress?.toLowerCase();
  if (!wallet) throw new AppError(400, "Wallet authenticated account required");
  return wallet;
}

nftItemRouter.post("/:itemId/like", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const item = await NFTItem.findById(req.params.itemId);
  if (!item) throw new AppError(404, "NFT item not found");
  try {
    await NFTLike.create({
      userId: req.user!.id,
      wallet,
      nftItemId: item._id,
      collectionId: item.collectionId,
      chainId: item.chainId,
      nftContract: item.contractAddress,
      tokenId: item.tokenId
    });
    item.likeCount = (item.likeCount ?? 0) + 1;
    await item.save();
    await refreshNFTTrendingScore(String(item._id));
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
  }
  const latest = await NFTItem.findById(item._id).select("likeCount").lean();
  res.json({ liked: true, likeCount: latest?.likeCount ?? item.likeCount ?? 0 });
}));

nftItemRouter.delete("/:itemId/like", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const item = await NFTItem.findById(req.params.itemId);
  if (!item) throw new AppError(404, "NFT item not found");
  const deleted = await NFTLike.findOneAndDelete({ nftItemId: item._id, wallet });
  if (deleted) {
    item.likeCount = Math.max((item.likeCount ?? 0) - 1, 0);
    await item.save();
    await refreshNFTTrendingScore(String(item._id));
  }
  res.json({ liked: false, likeCount: item.likeCount ?? 0 });
}));

nftItemRouter.get("/:itemId/like-status", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = walletFor(req);
  const item = await NFTItem.findById(req.params.itemId).select("likeCount").lean();
  if (!item) throw new AppError(404, "NFT item not found");
  const liked = await NFTLike.exists({ nftItemId: item._id, wallet });
  res.json({ liked: Boolean(liked), likeCount: item.likeCount ?? 0 });
}));

nftItemRouter.post("/:itemId/view", asyncHandler(async (req, res) => {
  const item = await NFTItem.findByIdAndUpdate(req.params.itemId, { $inc: { viewCount: 1 } }, { new: true }).select("viewCount");
  if (!item) throw new AppError(404, "NFT item not found");
  void refreshNFTTrendingScore(String(item._id)).catch(() => undefined);
  res.json({ viewCount: item.viewCount ?? 0 });
}));
