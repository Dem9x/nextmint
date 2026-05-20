import { createPublicClient, http } from "viem";
import { assertSupportedChain } from "../../config/chains.config.js";

export function getPublicClient(chainId: number) {
  const chain = assertSupportedChain(chainId);
  return createPublicClient({
    chain: chain.chain,
    transport: http(chain.rpcUrl)
  });
}
