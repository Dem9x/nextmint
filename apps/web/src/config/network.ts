import { DEFAULT_CHAIN_ID, ENABLE_TESTNET_MODE, SUPPORTED_CHAIN_IDS } from "./chains";

export const networkConfig = {
  defaultChainId: DEFAULT_CHAIN_ID,
  enableTestnetMode: ENABLE_TESTNET_MODE,
  supportedChainIds: SUPPORTED_CHAIN_IDS
} as const;
