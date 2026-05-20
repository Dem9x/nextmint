import { assertSupportedChain } from "../config/chains.config.js";
import { NFTCollection } from "../models/NFTCollection.js";
import { AppError } from "../middleware/error.js";

export async function assertMintNetwork(collectionId: string, chainId: number) {
  const chain = assertSupportedChain(chainId);
  const collection = await NFTCollection.findById(collectionId);
  if (!collection) throw new AppError(404, "Collection not found");
  if (collection.chainId && collection.chainId !== chainId) throw new AppError(400, "Collection chain mismatch");
  if (!collection.contractAddress) throw new AppError(400, `Collection is not deployed on ${chain.name}`);
  return { collection, chain };
}
