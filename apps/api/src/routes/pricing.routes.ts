import { Router } from "express";
import { createPaymentQuote, getQuote, getToken, listPlans, listTokens, providerHealth } from "../controllers/pricing.controller.js";

export const pricingRouter = Router();

pricingRouter.get("/tokens", listTokens);
pricingRouter.get("/token/:symbol", getToken);
pricingRouter.get("/quote", getQuote);
pricingRouter.post("/quote-payment", createPaymentQuote);
pricingRouter.get("/plans", listPlans);
pricingRouter.get("/providers/health", providerHealth);
