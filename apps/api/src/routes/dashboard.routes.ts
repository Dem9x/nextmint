import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getAIUsageChart, getCreatorSummary, getEarningsChart, getMintChart, getRecentTransactions, getRevenueChart, getUserNfts, getUserSummary } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/user/summary", getUserSummary);
dashboardRouter.get("/user/nfts", getUserNfts);
dashboardRouter.get("/creator/summary", getCreatorSummary);
dashboardRouter.get("/revenue-chart", getRevenueChart);
dashboardRouter.get("/mint-chart", getMintChart);
dashboardRouter.get("/ai-usage-chart", getAIUsageChart);
dashboardRouter.get("/earnings-chart", getEarningsChart);
dashboardRouter.get("/transactions/recent", getRecentTransactions);
