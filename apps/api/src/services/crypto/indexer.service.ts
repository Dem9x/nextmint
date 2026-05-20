import { createPublicClient, decodeEventLog, http } from "viem";
import { CryptoTransaction } from "../../models/CryptoTransaction.js";
import { txIndexQueue } from "../../queues/connection.js";
import { assertSupportedChain, supportedChains } from "./chains.js";
import { treasuryPaymentAbi } from "./payment-contract.js";

export async function enqueueConfirmationsForPendingPayments() {
  const pending = await CryptoTransaction.find({ status: { $in: ["submitted", "confirming"] }, txHash: { $exists: true } }).limit(500);
  await Promise.all(
    pending.map((payment: any) =>
      txIndexQueue.add("confirm-payment", {
        userId: String(payment.user),
        paymentId: payment.paymentId,
        txHash: payment.txHash
      })
    )
  );
}

export async function indexPaymentEvents(chainId: number, fromBlock: bigint, toBlock: bigint) {
  const config = assertSupportedChain(chainId);
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
  const logs = await client.getLogs({
    address: config.paymentContract as `0x${string}`,
    fromBlock,
    toBlock
  });
  return logs
    .map((log) => {
      try {
        return { log, event: decodeEventLog({ abi: treasuryPaymentAbi, data: log.data, topics: log.topics }) as any };
      } catch {
        return undefined;
      }
    })
    .filter(Boolean);
}

export function configuredChainIds() {
  return Object.keys(supportedChains).map(Number);
}
