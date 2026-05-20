import { env } from "./env.js";
import { TESTNET_CHAIN_IDS } from "./chains.config.js";

export const networkConfig = {
  defaultChainId: env.DEFAULT_CHAIN_ID,
  enableTestnetMode: env.ENABLE_TESTNET_MODE,
  supportedChainIds: TESTNET_CHAIN_IDS
} as const;
