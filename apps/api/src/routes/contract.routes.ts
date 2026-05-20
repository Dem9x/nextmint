import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { ContractDeployment } from "../models/ContractDeployment.js";
import { NFTCollection } from "../models/NFTCollection.js";
import { contractDeployQueue } from "../queues/connection.js";
import { assertSupportedChain } from "../config/chains.config.js";
import { asyncHandler } from "../utils/async-handler.js";

export const contractRouter = Router();
contractRouter.use(requireAuth);

contractRouter.post("/deploy", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ collectionId: z.string(), chainId: z.number() }).parse(req.body);
  const chain = assertSupportedChain(body.chainId);
  const deployment = await ContractDeployment.create({
    user: req.user!.id,
    collection: body.collectionId,
    chainId: body.chainId,
    contractName: "NexMintERC721A"
  });
  await NFTCollection.findOneAndUpdate(
    { _id: body.collectionId, owner: req.user!.id },
    {
      chainId: body.chainId,
      chainSlug: chain.slug,
      deploymentStatus: "queued",
      explorerUrl: chain.explorerUrl
    }
  );
  await contractDeployQueue.add("deploy", { deploymentId: String(deployment._id) });
  res.status(202).json({ deployment });
}));
