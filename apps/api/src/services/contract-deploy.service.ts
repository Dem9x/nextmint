import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertSupportedChain } from "../config/chains.config.js";
import { AppError } from "../middleware/error.js";

// Production note:
// This demo/testnet deployer reads private keys from env. Mainnet deployments
// should use secure key management, multisig review, or isolated deployer infra.

export function getDeployerForChain(chainId: number) {
  const chain = assertSupportedChain(chainId);
  if (!chain.privateKey) throw new AppError(400, `Missing deployer private key for ${chain.name}`);
  const account = privateKeyToAccount(chain.privateKey);
  return {
    chain,
    account,
    walletClient: createWalletClient({
      account,
      chain: chain.chain,
      transport: http(chain.rpcUrl)
    })
  };
}
