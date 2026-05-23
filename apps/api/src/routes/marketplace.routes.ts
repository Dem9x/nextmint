import { Router } from "express";
import { getCollectionStats, getContractStats, getMarketplaceActivity, getMarketplaceListing, getMarketplaceListings, getMarketplaceStats, getMarketplaceUser, getRecentActivity, getTopMarketplaceCollections, verifyCancel, verifyListing, verifySale } from "../controllers/marketplace.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const marketplaceRouter = Router();

marketplaceRouter.get("/listings", getMarketplaceListings);
marketplaceRouter.get("/stats", getMarketplaceStats);
marketplaceRouter.get("/collections/top", getTopMarketplaceCollections);
marketplaceRouter.get("/collections/:collectionId/stats", getCollectionStats);
marketplaceRouter.get("/contracts/:chainId/:contractAddress/stats", getContractStats);
marketplaceRouter.get("/activity/recent", getRecentActivity);
marketplaceRouter.get("/listings/:chainId/:contractAddress/:tokenId", getMarketplaceListing);
marketplaceRouter.get("/activity", getMarketplaceActivity);
marketplaceRouter.get("/user/:wallet", getMarketplaceUser);

marketplaceRouter.post("/verify-listing", requireAuth, verifyListing);
marketplaceRouter.post("/verify-sale", requireAuth, verifySale);
marketplaceRouter.post("/verify-cancel", requireAuth, verifyCancel);
