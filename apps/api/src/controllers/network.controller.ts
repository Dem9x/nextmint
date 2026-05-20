import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { CHAIN_REGISTRY, assertSupportedChain } from "../config/chains.config.js";
import { listPublicChains } from "../services/blockchain/chain-registry.service.js";

export function listChains(_req: Request, res: Response) {
  res.json({
    chains: listPublicChains(),
    defaultChainId: env.DEFAULT_CHAIN_ID,
    testnetModeEnabled: env.ENABLE_TESTNET_MODE
  });
}

export function getContracts(req: Request, res: Response) {
  const chainId = Number(req.params.chainId);
  const chain = assertSupportedChain(chainId);
  res.json({
    chainId,
    contracts: {
      treasuryPayment: chain.paymentContract ?? null,
      nftFactory: env[`${CHAIN_REGISTRY[chainId]?.slug.toUpperCase().replaceAll("-", "_")}_NFT_FACTORY` as keyof typeof env] ?? null
    }
  });
}
