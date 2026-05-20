import { decodeEventLog, getAddress, isAddress, parseAbi, type Hash, type TransactionReceipt } from "viem";
import { AppError } from "../../middleware/error.js";
import { CryptoTransaction } from "../../models/CryptoTransaction.js";
import { assertSupportedChain, getRequiredConfirmations } from "../../config/chains.config.js";
import { getPublicClient } from "./rpc-client.service.js";

const erc20TransferAbi = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
const RECEIPT_RETRY_ATTEMPTS = 18;
const RECEIPT_RETRY_DELAY_MS = 5_000;

type NativePaymentInput = {
  chainId: number;
  txHash: Hash;
  expectedFrom: string;
  expectedTo: string;
  expectedAmount: bigint;
};

type ERC20PaymentInput = {
  chainId: number;
  txHash: Hash;
  expectedFrom: string;
  expectedToken: string;
  expectedAmount: bigint;
};

function normalize(address: string) {
  if (!isAddress(address)) throw new AppError(400, `Invalid address: ${address}`);
  return getAddress(address).toLowerCase();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getReceipt(chainId: number, txHash: Hash, attempts = RECEIPT_RETRY_ATTEMPTS) {
  const client = getPublicClient(chainId);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(RECEIPT_RETRY_DELAY_MS);
    }
  }
  throw new AppError(404, "Transaction hash not found on selected chain", { chainId, txHash, lastError: lastError instanceof Error ? lastError.message : String(lastError) });
}

export async function waitForConfirmations({ chainId, txHash }: { chainId: number; txHash: Hash }) {
  const client = getPublicClient(chainId);
  const required = getRequiredConfirmations(chainId);
  let receipt = await getReceipt(chainId, txHash);
  for (let attempt = 1; attempt <= RECEIPT_RETRY_ATTEMPTS; attempt += 1) {
    const latest = await client.getBlockNumber();
    const confirmations = receipt.blockNumber ? Number(latest - receipt.blockNumber + 1n) : 0;
    if (confirmations >= required) return { receipt, confirmations };
    if (attempt < RECEIPT_RETRY_ATTEMPTS) {
      await sleep(RECEIPT_RETRY_DELAY_MS);
      receipt = await getReceipt(chainId, txHash, 1);
    }
  }
  throw new AppError(202, `Waiting for confirmations on selected chain. Retry verification in a moment.`);
}

async function rejectProcessedHash(chainId: number, txHash: Hash) {
  const existing = await CryptoTransaction.findOne({ chainId, txHash: txHash.toLowerCase(), status: "confirmed" }).lean();
  if (existing) throw new AppError(409, "Transaction hash has already been processed");
}

export async function verifyNativePayment(input: NativePaymentInput) {
  const chain = assertSupportedChain(input.chainId);
  await rejectProcessedHash(input.chainId, input.txHash);
  const { receipt, confirmations } = await waitForConfirmations({ chainId: input.chainId, txHash: input.txHash });
  const client = getPublicClient(input.chainId);
  const tx = await client.getTransaction({ hash: input.txHash });
  if (receipt.status !== "success") throw new AppError(400, "Transaction failed on-chain");
  if (normalize(tx.from) !== normalize(input.expectedFrom)) throw new AppError(400, "Transaction sender mismatch");
  if (!tx.to || normalize(tx.to) !== normalize(input.expectedTo)) throw new AppError(400, "Transaction recipient mismatch");
  if (tx.value < input.expectedAmount) throw new AppError(400, `Native payment amount too low on ${chain.name}`);
  return { receipt, confirmations };
}

export async function verifyERC20Payment(input: ERC20PaymentInput) {
  assertSupportedChain(input.chainId);
  await rejectProcessedHash(input.chainId, input.txHash);
  const { receipt, confirmations } = await waitForConfirmations({ chainId: input.chainId, txHash: input.txHash });
  if (receipt.status !== "success") throw new AppError(400, "Transaction failed on-chain");
  const expectedFrom = normalize(input.expectedFrom);
  const expectedToken = normalize(input.expectedToken);
  const matchingLog = receipt.logs.find((log) => {
    if (normalize(log.address) !== expectedToken) return false;
    try {
      const decoded = decodeEventLog({ abi: erc20TransferAbi, data: log.data, topics: log.topics });
      return (
        decoded.eventName === "Transfer" &&
        normalize(decoded.args.from) === expectedFrom &&
        BigInt(decoded.args.value) >= input.expectedAmount
      );
    } catch {
      return false;
    }
  });
  if (!matchingLog) throw new AppError(400, "ERC20 transfer event not found");
  return { receipt, confirmations };
}

export function parsePaymentEvent(_chainId: number, receipt: TransactionReceipt) {
  return receipt.logs;
}
