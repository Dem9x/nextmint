import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { adminSummary, aiUsageChart, creatorSummary, earningsChart, mintChart, recentTransactions, revenueChart, userSummary } from "../services/dashboard/dashboard.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const chartQuery = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
  chainId: z.string().optional()
});

export const getUserSummary = asyncHandler(async (req: AuthRequest, res) => {
  res.json(await userSummary(req.user!.id));
});

export const getCreatorSummary = asyncHandler(async (req: AuthRequest, res) => {
  res.json(await creatorSummary(req.user!.id));
});

export const getAdminSummary = asyncHandler(async (_req, res) => {
  res.json(await adminSummary());
});

export const getRevenueChart = asyncHandler(async (req, res) => {
  const query = chartQuery.parse(req.query);
  res.json({ data: await revenueChart(query.range, query.chainId && query.chainId !== "all" ? Number(query.chainId) : undefined) });
});

export const getMintChart = asyncHandler(async (req, res) => {
  const query = chartQuery.parse(req.query);
  res.json({ data: await mintChart(query.range, query.chainId && query.chainId !== "all" ? Number(query.chainId) : undefined) });
});

export const getAIUsageChart = asyncHandler(async (req, res) => {
  const query = chartQuery.parse(req.query);
  res.json({ data: await aiUsageChart(query.range) });
});

export const getEarningsChart = asyncHandler(async (req: AuthRequest, res) => {
  const query = chartQuery.parse(req.query);
  res.json({ data: await earningsChart(req.user!.id, query.range) });
});

export const getRecentTransactions = asyncHandler(async (req: AuthRequest, res) => {
  res.json({ transactions: await recentTransactions(req.user!.id) });
});
