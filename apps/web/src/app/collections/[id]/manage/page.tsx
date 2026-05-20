"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseAbi } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

const paymentAbi = parseAbi(["function payNative(bytes32 paymentId,string purpose) payable"]);

type Collection = {
  _id: string;
  name: string;
  slug: string;
  status: string;
  chainId: number;
  contractAddress?: `0x${string}`;
  deploymentTxHash?: string;
  publishFeeStatus: string;
  publishFeePaymentId?: string;
  maxSupply: number;
  totalMinted: number;
  mintPrice: string;
  metadataBaseUri?: string;
};

type PaymentResponse = {
  payment: { paymentId: string };
  transactionRequest: { to: `0x${string}`; value: string; paymentId: string; paymentIdBytes32: `0x${string}`; purpose: string };
};

export default function ManageCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [id, setId] = useState<string>();
  const [collection, setCollection] = useState<Collection>();
  const [payment, setPayment] = useState<PaymentResponse>();
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then((value) => setId(value.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    load(id);
  }, [id]);

  async function load(collectionId = id) {
    if (!collectionId) return;
    setIsLoading(true);
    await withMinimumDelay(api<{ collection: Collection }>(`/api/collections/${collectionId}`))
      .then((result) => setCollection(result.collection))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load collection"))
      .finally(() => setIsLoading(false));
  }

  async function deploy() {
    if (!collection) return;
    try {
      setIsLoading(true);
      setError(undefined);
      setStatus("Deploying collection contract...");
      const result = await withMinimumDelay(api<{ collection: Collection }>(`/api/collections/${collection._id}/deploy`, {
        method: "POST",
        body: JSON.stringify({ chainId: collection.chainId })
      }));
      setCollection(result.collection);
      setStatus("Contract deployed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function createPublishQuote() {
    if (!collection) return;
    try {
      setIsLoading(true);
      setError(undefined);
      const result = await withMinimumDelay(api<PaymentResponse>(`/api/collections/${collection._id}/publish-quote`, {
        method: "POST",
        body: JSON.stringify({ chainId: collection.chainId, token: "NATIVE" })
      }));
      setPayment(result);
      setStatus("Publish fee quote ready.");
      await load(collection._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function payPublishFee() {
    if (!collection || !payment) return;
    try {
      if (!address) throw new Error("Connect creator wallet first");
      setIsLoading(true);
      setError(undefined);
      setStatus("Waiting for wallet payment...");
      const txHash = await writeContractAsync({
        address: payment.transactionRequest.to,
        abi: paymentAbi,
        functionName: "payNative",
        args: [payment.transactionRequest.paymentIdBytes32, payment.transactionRequest.purpose],
        value: BigInt(payment.transactionRequest.value)
      });
      setStatus("Verifying publish fee...");
      const result = await withMinimumDelay(api<{ collection: Collection }>(`/api/collections/${collection._id}/verify-publish-fee`, {
        method: "POST",
        body: JSON.stringify({ paymentId: payment.transactionRequest.paymentId, chainId: collection.chainId, txHash })
      }));
      setCollection(result.collection);
      setStatus("Publish fee verified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish payment failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function publish() {
    if (!collection) return;
    try {
      setIsLoading(true);
      setError(undefined);
      const result = await withMinimumDelay(api<{ collection: Collection }>(`/api/collections/${collection._id}/publish`, { method: "POST" }));
      setCollection(result.collection);
      setStatus("Collection published to launchpad.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard>
        <section className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-4xl font-black">Manage Collection</h1>
          {isLoading && <p className="mt-5 rounded-md border border-cyan/20 bg-cyan/10 p-3 text-cyan">Loading for 5 seconds...</p>}
          {error && <p className="mt-5 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
          {status && <p className="mt-5 rounded-md border border-lime/30 bg-lime/10 p-3 text-lime">{status}</p>}
          {collection && (
            <div className="mt-8 rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{collection.name}</h2>
                  <p className="mt-2 text-sm text-muted">Status: {collection.status}</p>
                  <p className="text-sm text-muted">Supply: {collection.totalMinted}/{collection.maxSupply}</p>
                  <p className="text-sm text-muted">Mint price: {collection.mintPrice}</p>
                </div>
                <ChainBadge chainId={collection.chainId} />
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <p className="break-all rounded-md bg-white/5 p-3">Metadata base URI: {collection.metadataBaseUri ?? "Missing"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Contract: {collection.contractAddress ?? "Not deployed"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Publish fee: {collection.publishFeeStatus}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={isLoading || Boolean(collection.contractAddress)} onClick={deploy}>Deploy Contract</Button>
                <Button disabled={isLoading || !collection.contractAddress || collection.publishFeeStatus === "verified"} onClick={createPublishQuote}>Create Publish Fee Quote</Button>
                {payment && <Button disabled={isLoading || isPending} onClick={payPublishFee}>Pay Publish Fee</Button>}
                <Button disabled={isLoading || collection.publishFeeStatus !== "verified" || ["published", "minting_live"].includes(collection.status)} onClick={publish}>Publish To Launchpad</Button>
                {["published", "minting_live", "sold_out"].includes(collection.status) && <Link className="rounded-md border border-cyan/40 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10" href={`/launchpad/${collection.slug}`}>Open Mint Page</Link>}
              </div>
            </div>
          )}
        </section>
      </AuthGuard>
    </main>
  );
}
