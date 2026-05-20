import { formatEther } from "viem";
import { CHAIN_REGISTRY, assertSupportedChain } from "../../config/chains.config.js";
import { TreasuryBalance } from "../../models/TreasuryBalance.js";
import { getPublicClient } from "../blockchain/rpc-client.service.js";
import { getTokenPrice } from "../../pricing/services/crypto-pricing.service.js";

export async function syncTreasuryBalance(chainId: number) {
  const chain = assertSupportedChain(chainId);
  const treasuryAddress = chain.treasuryAddress ?? chain.paymentContract;
  if (!treasuryAddress) throw new Error(`Missing treasury address for ${chain.name}`);
  const client = getPublicClient(chainId);
  const balance = await client.getBalance({ address: treasuryAddress });
  const price = await getTokenPrice(chain.nativeCurrency === "tBNB" ? "BNB" : chain.nativeCurrency, chainId).catch(() => undefined);
  const balanceToken = formatEther(balance);
  return TreasuryBalance.findOneAndUpdate(
    { chainId, treasuryAddress: treasuryAddress.toLowerCase(), token: chain.nativeCurrency },
    {
      chainId,
      treasuryAddress: treasuryAddress.toLowerCase(),
      token: chain.nativeCurrency,
      tokenAddress: undefined,
      balanceToken,
      priceUsd: price?.priceUsd ?? null,
      balanceUsd: price ? Number(balanceToken) * price.priceUsd : null,
      provider: price?.provider ?? "rpc",
      lastSyncedAt: new Date()
    },
    { upsert: true, new: true }
  );
}

export async function syncAllTreasuryBalances() {
  const configuredChains = Object.values(CHAIN_REGISTRY).filter((chain) => chain.rpcUrl && (chain.treasuryAddress || chain.paymentContract));
  return Promise.all(configuredChains.map((chain) => syncTreasuryBalance(chain.chainId)));
}

export async function listTreasuryBalances() {
  return TreasuryBalance.find().sort({ chainId: 1, token: 1 }).lean();
}
