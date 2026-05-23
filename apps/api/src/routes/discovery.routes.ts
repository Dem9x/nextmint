import { Router } from "express";
import { z } from "zod";
import { getTrendingCollections, getTrendingNFTs } from "../services/discovery/trending.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const discoveryRouter = Router();

const trendingQuery = z.object({
  chainId: z.coerce.number().int().optional(),
  collectionId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  window: z.enum(["24h", "7d", "all"]).default("all")
});

discoveryRouter.get("/trending/collections", asyncHandler(async (req, res) => {
  const query = trendingQuery.parse(req.query);
  res.json({ collections: await getTrendingCollections(query) });
}));

discoveryRouter.get("/trending/nfts", asyncHandler(async (req, res) => {
  const query = trendingQuery.parse(req.query);
  res.json({ nfts: await getTrendingNFTs(query) });
}));
