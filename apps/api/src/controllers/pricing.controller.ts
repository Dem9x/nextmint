import { z } from "zod";
import { TokenPrice } from "../models/TokenPrice.js";
import { PriceProviderHealth } from "../models/PriceProviderHealth.js";
import { getPublicPlans } from "../services/platform-settings.service.js";
import { createQuote, getTokenPrice, quotePayment } from "../pricing/services/crypto-pricing.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listTokens = asyncHandler(async (_req, res) => {
  res.json({ tokens: await TokenPrice.find().sort({ tokenSymbol: 1, chainId: 1 }).lean() });
});

export const getToken = asyncHandler(async (req, res) => {
  const chainId = Number(req.query.chainId ?? 84532);
  res.json({ token: await getTokenPrice(req.params.symbol, chainId) });
});

export const getQuote = asyncHandler(async (req, res) => {
  const query = z.object({
    chainId: z.coerce.number().int(),
    token: z.string(),
    usdAmount: z.coerce.number().positive()
  }).parse(req.query);
  res.json(await createQuote(query));
});

export const createPaymentQuote = asyncHandler(async (req, res) => {
  const body = z.object({
    chainId: z.number().int(),
    token: z.string(),
    packageId: z.string().optional(),
    plan: z.string().optional(),
    interval: z.enum(["monthly", "yearly"]).optional()
  }).parse(req.body);
  res.json(await quotePayment(body));
});

export const listPlans = asyncHandler(async (_req, res) => {
  res.json({ plans: await getPublicPlans() });
});

export const providerHealth = asyncHandler(async (_req, res) => {
  res.json({ providers: await PriceProviderHealth.find().sort({ provider: 1 }).lean() });
});
