"use client";

import { useState } from "react";
import { useAccount, useSignMessage, useWriteContract } from "wagmi";
import { parseAbi } from "viem";
import { Button } from "@/components/ui/button";
import { SUPPORTED_TESTNET_CHAINS } from "@/config/chains";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

const tokens = ["NATIVE", "USDC", "USDT", "DAI"] as const;
const abi = parseAbi(["function payNative(bytes32 paymentId,string purpose) payable", "function payToken(bytes32 paymentId,address token,uint256 amount,string purpose)"]);

export function CryptoPaymentCard() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, isPending } = useWriteContract();
  const { selectedChainId, setSelectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const [token, setToken] = useState<(typeof tokens)[number]>("NATIVE");
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);

  async function ensureWalletSession() {
    if (!address) throw new Error("Connect wallet first");
    const existing = localStorage.getItem("nexmint_token");
    if (existing) return existing;
    setStatus("Signing wallet login...");
    const nonce = await withMinimumDelay(api<{ message: string }>("/api/auth/wallet/nonce", {
      method: "POST",
      body: JSON.stringify({ address })
    }));
    const signature = await signMessageAsync({ message: nonce.message });
    const session = await withMinimumDelay(api<{ token: string }>("/api/auth/wallet", {
      method: "POST",
      body: JSON.stringify({ address, signature, chainId, connector: "walletconnect" })
    }));
    localStorage.setItem("nexmint_token", session.token);
    return session.token;
  }

  async function buyCredits() {
    try {
      setIsLoading(true);
      if (!address) return setStatus("Connect wallet first");
      await ensureWalletSession();
      if (chainId !== selectedChainId || isWrongNetwork) {
        setStatus("Switching testnet...");
        await switchToSelectedChain();
        return setStatus("Network switched. Click pay again to continue.");
      }
      setStatus("Creating crypto payment...");
      const result = await withMinimumDelay(api<{ transactionRequest: { to: `0x${string}`; token: `0x${string}`; amount: string; value: string; paymentId: string; paymentIdBytes32: `0x${string}`; purpose: string } }>("/api/crypto/create-payment", {
        method: "POST",
        body: JSON.stringify({ walletAddress: address, chainId: selectedChainId, token, purpose: "credits", packageId: "pro" })
      }));
      const req = result.transactionRequest;
      const hash = token === "NATIVE"
        ? await writeContractAsync({ address: req.to, abi, functionName: "payNative", args: [req.paymentIdBytes32, req.purpose], value: BigInt(req.value) })
        : await writeContractAsync({ address: req.to, abi, functionName: "payToken", args: [req.paymentIdBytes32, req.token, BigInt(req.amount), req.purpose] });
      setStatus("Verifying on-chain payment...");
      await withMinimumDelay(api("/api/crypto/verify-payment", { method: "POST", body: JSON.stringify({ chainId: selectedChainId, paymentId: req.paymentId, txHash: hash }) }));
      setStatus("Credits added");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5 shadow-glow">
      <div className="mb-4">
        <p className="text-sm text-muted">Crypto credits</p>
        <h3 className="text-2xl font-bold">Pro Credit Pack</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="rounded-md border border-white/10 bg-black/40 p-3" value={selectedChainId} onChange={(e) => setSelectedChainId(Number(e.target.value))}>
          {SUPPORTED_TESTNET_CHAINS.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/40 p-3" value={token} onChange={(e) => setToken(e.target.value as typeof token)}>
          {tokens.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <Button className="mt-4 w-full" disabled={isPending || isLoading} onClick={buyCredits}>{isPending || isLoading ? "Processing..." : "Pay with wallet"}</Button>
      <p className="mt-3 text-sm text-muted">{status}</p>
    </div>
  );
}
