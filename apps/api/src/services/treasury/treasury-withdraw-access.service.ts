import { getAddress, isAddress, parseAbi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../../config/env.js";
import { assertSupportedChain } from "../../config/chains.config.js";
import { AppError } from "../../middleware/error.js";
import { getPublicClient } from "../blockchain/rpc-client.service.js";

const treasuryOwnerAbi = parseAbi([
  "function owner() view returns (address)",
  "function treasury() view returns (address)"
]);

// Production note:
// Treasury access policy and withdrawal operations should remain private and
// require operational review, multisig controls, and monitored admin actions.

function normalizeAddress(value?: string | null) {
  return value && isAddress(value) ? getAddress(value).toLowerCase() : undefined;
}

function splitAddresses(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeAddress(item.trim()))
    .filter(Boolean) as string[];
}

function accountFromPrivateKey(value?: string) {
  if (!value?.startsWith("0x")) return undefined;
  try {
    return privateKeyToAccount(value as `0x${string}`).address.toLowerCase();
  } catch {
    return undefined;
  }
}

export function getConfiguredWithdrawAddresses(chainId: number) {
  const chain = assertSupportedChain(chainId);
  const derived = [
    accountFromPrivateKey(chain.privateKey),
    accountFromPrivateKey(env.DEPLOYER_PRIVATE_KEY),
    normalizeAddress(chain.treasuryAddress),
    normalizeAddress(env.TREASURY_WALLET),
    ...splitAddresses(env.ADMIN_WITHDRAW_ADDRESSES)
  ].filter(Boolean) as string[];
  return [...new Set(derived)];
}

export async function getTreasuryWithdrawAccess(input: {
  chainId: number;
  userWalletAddress?: string;
}) {
  const chain = assertSupportedChain(input.chainId);
  if (!chain.paymentContract) throw new AppError(400, `Missing payment contract for ${chain.name}`);

  const userWallet = normalizeAddress(input.userWalletAddress);
  if (!userWallet) throw new AppError(403, "Admin wallet signature required for treasury withdraw access");

  const client = getPublicClient(input.chainId);
  const [owner, treasury] = await Promise.all([
    client.readContract({ address: chain.paymentContract, abi: treasuryOwnerAbi, functionName: "owner" }),
    client.readContract({ address: chain.paymentContract, abi: treasuryOwnerAbi, functionName: "treasury" })
  ]);

  const contractOwner = owner.toLowerCase();
  const configuredAddresses = getConfiguredWithdrawAddresses(input.chainId);
  const allowedAddresses = [...new Set([contractOwner, ...configuredAddresses])];
  const allowed = userWallet === contractOwner;

  return {
    allowed,
    reason: allowed ? null : "Connected admin wallet is not the on-chain TreasuryPayments owner.",
    chainId: input.chainId,
    chainName: chain.name,
    contractAddress: chain.paymentContract,
    treasuryAddress: (treasury as Address).toLowerCase(),
    contractOwner,
    userWallet,
    allowedAddresses
  };
}
