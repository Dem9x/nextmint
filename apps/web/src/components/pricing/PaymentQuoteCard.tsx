"use client";

import { useState } from "react";
import { parseAbi } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";
import { PriceBreakdownCard } from "./PriceBreakdownCard";
import { TokenSelector } from "./TokenSelector";

const paymentAbi = parseAbi(["function payNative(bytes32 paymentId,string purpose) payable", "function payToken(bytes32 paymentId,address token,uint256 amount,string purpose)"]);

type PaymentQuote = {
  usdAmount: number;
  token: string;
  tokenAmount: string;
  priceUsd: number;
  provider: string;
  expiresAt: string;
  isFallback: boolean;
  contractAddress?: string;
  treasuryAddress?: string;
  transactionRequest?: PaymentRequest["transactionRequest"];
};

type PaymentRequest = {
  transactionRequest: {
    chainId: number;
    to: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    value: string;
    paymentId: string;
    paymentIdBytes32: `0x${string}`;
    purpose: string;
  };
};

export function PaymentQuoteCard({ packageId, planId, mode = "credits" }: { packageId?: string; planId?: string; mode?: "credits" | "subscription" }) {
  const { address, chainId } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { selectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const [token, setToken] = useState("NATIVE");
  const [quote, setQuote] = useState<PaymentQuote>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>();
  const [pendingPayment, setPendingPayment] = useState<{ paymentId: string; txHash: `0x${string}` }>();

  async function refresh() {
    try {
      setIsLoading(true);
      setError(undefined);
      setPaymentStatus(undefined);
      setPendingPayment(undefined);
      const endpoint = mode === "subscription" ? "/api/subscription/quote" : "/api/pricing/quote-payment";
      setQuote(await withMinimumDelay(api<PaymentQuote>(endpoint, { method: "POST", body: JSON.stringify({ chainId: selectedChainId, packageId, planId, token }) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function pay() {
    try {
      if (!address) throw new Error("Connect wallet first");
      if (!quote) throw new Error("Refresh quote first");
      if (chainId !== selectedChainId || isWrongNetwork) {
        setPaymentStatus("Switching network...");
        await switchToSelectedChain();
        setPaymentStatus("Network switched. Click Pay again.");
        return;
      }
      setIsLoading(true);
      setError(undefined);
      setPaymentStatus("Creating payment...");
      const result = mode === "subscription" && quote.transactionRequest
        ? { transactionRequest: quote.transactionRequest }
        : await withMinimumDelay(api<PaymentRequest>("/api/crypto/create-payment", {
          method: "POST",
          body: JSON.stringify({ walletAddress: address, chainId: selectedChainId, token, purpose: "credits", packageId })
        }));
      const req = result.transactionRequest;
      setPaymentStatus("Waiting for wallet confirmation...");
      const txHash = token === "NATIVE"
        ? await writeContractAsync({ address: req.to, abi: paymentAbi, functionName: "payNative", args: [req.paymentIdBytes32, req.purpose], value: BigInt(req.value) })
        : await writeContractAsync({ address: req.to, abi: paymentAbi, functionName: "payToken", args: [req.paymentIdBytes32, req.token, BigInt(req.amount), req.purpose] });
      setPendingPayment({ paymentId: req.paymentId, txHash });
      setPaymentStatus("Verifying on-chain payment...");
      await verifyPayment(req.paymentId, txHash);
      setPaymentStatus(mode === "subscription" ? "Subscription active." : "Payment verified. Credits added.");
    } catch (err) {
      setPaymentStatus(undefined);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function retryVerify() {
    if (!pendingPayment) return;
    try {
      setIsLoading(true);
      setError(undefined);
      setPaymentStatus("Verifying on-chain payment...");
      await verifyPayment(pendingPayment.paymentId, pendingPayment.txHash);
      setPaymentStatus(mode === "subscription" ? "Subscription active." : "Payment verified. Credits added.");
      setPendingPayment(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyPayment(paymentId: string, txHash: `0x${string}`) {
    await withMinimumDelay(api(mode === "subscription" ? "/api/subscription/verify-payment" : "/api/crypto/verify-payment", {
      method: "POST",
      body: JSON.stringify({ chainId: selectedChainId, paymentId, txHash })
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <TokenSelector value={token} onChange={setToken} />
        <Button disabled={isLoading} onClick={refresh}>{isLoading ? "Refreshing..." : "Refresh Quote"}</Button>
      </div>
      {error && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
      <PriceBreakdownCard quote={quote} />
      {quote && (
        <Button className="w-full" disabled={isLoading || isPending} onClick={pay}>
          {isLoading || isPending ? "Processing Payment..." : `Pay ${quote.tokenAmount} ${quote.token}`}
        </Button>
      )}
      {pendingPayment && error && (
        <Button className="w-full border border-cyan/40 bg-transparent text-cyan hover:bg-cyan/10" disabled={isLoading} onClick={retryVerify}>
          {isLoading ? "Verifying..." : "Retry Verify Paid Transaction"}
        </Button>
      )}
      {paymentStatus && <p className="rounded-md border border-cyan/20 bg-cyan/10 p-3 text-sm text-cyan">{paymentStatus}</p>}
    </div>
  );
}
