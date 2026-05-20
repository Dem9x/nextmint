import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { getNftItem, prepareFromGeneration, revalidateMint, verifyMint } from "../controllers/nft.controller.js";

export const nftRouter = Router();

nftRouter.get("/items/:id", optionalAuth, getNftItem);
nftRouter.use(requireAuth);
nftRouter.post("/prepare-from-generation", prepareFromGeneration);
nftRouter.post("/verify-mint", verifyMint);
nftRouter.post("/items/:id/revalidate", revalidateMint);
