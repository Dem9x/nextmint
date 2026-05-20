import { Router } from "express";
import { getContracts, listChains } from "../controllers/network.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const networkRouter = Router();

networkRouter.get("/chains", asyncHandler(listChains));
networkRouter.get("/contracts/:chainId", asyncHandler(getContracts));
