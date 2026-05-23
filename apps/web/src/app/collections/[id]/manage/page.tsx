"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseAbi } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CreatorBadges } from "@/components/badges/CreatorBadges";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

const paymentAbi = parseAbi(["function payNative(bytes32 paymentId,string purpose) payable"]);

type Collection = {
  _id: string;
  name: string;
  symbol: string;
  description?: string;
  slug: string;
  status: string;
  chainId: number;
  contractAddress?: `0x${string}`;
  deploymentTxHash?: string;
  publishFeeStatus: string;
  publishFeePaymentId?: string;
  maxSupply: number;
  totalMinted: number;
  maxMintPerWallet?: number;
  royaltyBps?: number;
  payoutWallet?: string;
  mintPrice: string;
  platformMintFeeBps?: number;
  publicMintStartAt?: string;
  publicMintEndAt?: string;
  revealMode?: string;
  placeholderUri?: string;
  isRevealed?: boolean;
  metadataBaseUri?: string;
  metadataBaseIpfsUri?: string;
  baseMetadataUri?: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  externalUrl?: string;
  creatorDisplayName?: string;
  creatorBio?: string;
  creatorAvatarUrl?: string;
  isVerifiedCollection?: boolean;
  isVerifiedCreator?: boolean;
  isProCreator?: boolean;
  collectionBadge?: string;
  creatorProfile?: {
    activePlanPublicBadge?: string | null;
    isVerifiedCreator?: boolean;
    isProCreator?: boolean;
  };
};

type EditForm = {
  name: string;
  symbol: string;
  description: string;
  maxSupply: string;
  mintPrice: string;
  maxMintPerWallet: string;
  royaltyBps: string;
  publicMintStartAt: string;
  publicMintEndAt: string;
  revealMode: "instant" | "delayed" | "placeholder";
  placeholderUri: string;
  payoutWallet: string;
  metadataBaseUri: string;
};

type ProfileForm = {
  description: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  websiteUrl: string;
  twitterUrl: string;
  discordUrl: string;
  telegramUrl: string;
  externalUrl: string;
  creatorDisplayName: string;
  creatorBio: string;
  creatorAvatarUrl: string;
};

type Readiness = {
  totalItems: number;
  metadataReady: number;
  failedItems: number;
  missingImageIpfs: number;
  missingMetadata: number;
  missingMetadataIpfs: number;
  metadataBaseUri?: string;
  expectedFirstTokenUri?: string;
  expectedLastTokenUri?: string;
  deployable: boolean;
  reason?: string;
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
  const [readiness, setReadiness] = useState<Readiness>();
  const [editForm, setEditForm] = useState<EditForm>();
  const [profileForm, setProfileForm] = useState<ProfileForm>();
  const [payment, setPayment] = useState<PaymentResponse>();
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const hasGeneratedItems = (readiness?.totalItems ?? 0) > 0;
  const supplyLocked = Boolean(collection?.contractAddress) || hasGeneratedItems;
  const deployDisabledReason = collection?.contractAddress
    ? "Contract already deployed."
    : readiness?.deployable
      ? undefined
      : readiness?.reason ?? "Metadata checklist is still loading.";

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
    await withMinimumDelay(api<{ collection: Collection; readiness: Readiness }>(`/api/collections/${collectionId}`))
      .then((result) => {
        setCollection(result.collection);
        setReadiness(result.readiness);
        setEditForm(toEditForm(result.collection));
        setProfileForm(toProfileForm(result.collection));
      })
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

  async function saveConfig() {
    if (!collection || !editForm) return;
    try {
      setIsLoading(true);
      setError(undefined);
      const result = await withMinimumDelay(api<{ collection: Collection }>(`/api/collections/${collection._id}/config`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          symbol: editForm.symbol,
          description: editForm.description,
          mintPrice: editForm.mintPrice,
          maxMintPerWallet: Number(editForm.maxMintPerWallet),
          maxSupply: Number(editForm.maxSupply),
          royaltyBps: Number(editForm.royaltyBps),
          publicMintStartAt: new Date(editForm.publicMintStartAt).toISOString(),
          publicMintEndAt: editForm.publicMintEndAt ? new Date(editForm.publicMintEndAt).toISOString() : "",
          revealMode: editForm.revealMode,
          placeholderUri: editForm.placeholderUri || undefined,
          payoutWallet: editForm.payoutWallet || undefined,
          metadataBaseUri: editForm.metadataBaseUri || undefined
        })
      }));
      setCollection(result.collection);
      setEditForm(toEditForm(result.collection));
      setStatus("Collection settings saved.");
      await load(collection._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProfile() {
    if (!collection || !profileForm) return;
    try {
      setIsLoading(true);
      setError(undefined);
      const result = await withMinimumDelay(api<{ profile: Collection }>(`/api/collections/${collection._id}/profile`, {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      }));
      setCollection((current) => current ? { ...current, ...result.profile } : result.profile);
      setProfileForm(toProfileForm(result.profile));
      setStatus("Collection profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile save failed");
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
            <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{collection.name}</h2>
                  <p className="mt-2 text-sm text-muted">Status: {collection.status}</p>
                  <p className="text-sm text-muted">Supply: {collection.totalMinted}/{collection.maxSupply}</p>
                  <p className="text-sm text-muted">Mint price: {collection.mintPrice}</p>
                </div>
                <ChainBadge chainId={collection.chainId} />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-cyan">Collection Profile</p>
                  <h2 className="mt-1 text-2xl font-bold">Marketplace Display</h2>
                  <p className="mt-2 text-sm text-muted">These details appear on your public marketplace and launchpad collection pages.</p>
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Badge Preview</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-black">{collection.name}</span>
                      <CreatorBadges
                        isVerifiedCollection={collection.isVerifiedCollection}
                        isVerifiedCreator={collection.isVerifiedCreator ?? collection.creatorProfile?.isVerifiedCreator}
                        isProCreator={collection.isProCreator ?? collection.creatorProfile?.isProCreator}
                      />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                      <span>Verified: {collection.isVerifiedCollection || collection.isVerifiedCreator || collection.creatorProfile?.isVerifiedCreator ? "Yes" : "No"}</span>
                      <span>Creator plan: {collection.isProCreator || collection.creatorProfile?.isProCreator ? "Pro" : collection.creatorProfile?.activePlanPublicBadge ?? "None"}</span>
                      <span>Assigned by NEXMINT review/admin.</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded-md border border-cyan/40 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10" href={`/marketplace/collections/${collection._id}`}>Preview</Link>
                  <Button disabled={isLoading || !profileForm} onClick={saveProfile}>Save Profile</Button>
                </div>
              </div>
              {profileForm && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Input label="Banner image URL" value={profileForm.bannerImageUrl} onChange={(value) => setProfileForm({ ...profileForm, bannerImageUrl: value })} />
                  <Input label="Avatar/profile image URL" value={profileForm.profileImageUrl} onChange={(value) => setProfileForm({ ...profileForm, profileImageUrl: value })} />
                  <Input label="Creator display name" value={profileForm.creatorDisplayName} onChange={(value) => setProfileForm({ ...profileForm, creatorDisplayName: value })} />
                  <Input label="Creator avatar URL" value={profileForm.creatorAvatarUrl} onChange={(value) => setProfileForm({ ...profileForm, creatorAvatarUrl: value })} />
                  <label className="block text-sm text-muted md:col-span-2">
                    Collection description
                    <textarea className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={profileForm.description} onChange={(event) => setProfileForm({ ...profileForm, description: event.target.value })} />
                  </label>
                  <label className="block text-sm text-muted md:col-span-2">
                    Creator bio
                    <textarea className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={profileForm.creatorBio} onChange={(event) => setProfileForm({ ...profileForm, creatorBio: event.target.value })} />
                  </label>
                  <Input label="Website URL" value={profileForm.websiteUrl} onChange={(value) => setProfileForm({ ...profileForm, websiteUrl: value })} />
                  <Input label="X/Twitter URL" value={profileForm.twitterUrl} onChange={(value) => setProfileForm({ ...profileForm, twitterUrl: value })} />
                  <Input label="Discord URL" value={profileForm.discordUrl} onChange={(value) => setProfileForm({ ...profileForm, discordUrl: value })} />
                  <Input label="Telegram URL" value={profileForm.telegramUrl} onChange={(value) => setProfileForm({ ...profileForm, telegramUrl: value })} />
                  <Input label="External URL" value={profileForm.externalUrl} onChange={(value) => setProfileForm({ ...profileForm, externalUrl: value })} />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-cyan">Edit Collection</p>
                  <h2 className="mt-1 text-2xl font-bold">Launch Settings</h2>
                  <p className="mt-2 text-sm text-muted">Edit allowed fields before publish. Contract-critical fields lock after deploy starts.</p>
                </div>
                <Button disabled={isLoading || !editForm} onClick={saveConfig}>Save Changes</Button>
              </div>
              {editForm && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Input label="Collection name" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} disabled={Boolean(collection.contractAddress)} />
                  <Input label="Symbol" value={editForm.symbol} onChange={(value) => setEditForm({ ...editForm, symbol: value.toUpperCase() })} disabled={Boolean(collection.contractAddress)} />
                  <label className="block text-sm text-muted md:col-span-2">
                    Description
                    <textarea className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} />
                  </label>
                  <Input label="Mint price" value={editForm.mintPrice} onChange={(value) => setEditForm({ ...editForm, mintPrice: value })} />
                  <div>
                    <Input label="Max supply" type="number" value={editForm.maxSupply} onChange={(value) => setEditForm({ ...editForm, maxSupply: value })} disabled={supplyLocked} />
                    {supplyLocked && (
                      <p className="mt-2 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-xs text-yellow-100">
                        Supply is locked after collection assets are generated. Current generated items: {readiness?.totalItems ?? 0}. To change supply, create or regenerate a collection with the new amount.
                      </p>
                    )}
                  </div>
                  <Input label="Max mint per wallet" type="number" value={editForm.maxMintPerWallet} onChange={(value) => setEditForm({ ...editForm, maxMintPerWallet: value })} />
                  <Input label="Royalty BPS" type="number" value={editForm.royaltyBps} onChange={(value) => setEditForm({ ...editForm, royaltyBps: value })} />
                  <Input label="Payout wallet" value={editForm.payoutWallet} onChange={(value) => setEditForm({ ...editForm, payoutWallet: value })} />
                  <Input label="Mint start" type="datetime-local" value={editForm.publicMintStartAt} onChange={(value) => setEditForm({ ...editForm, publicMintStartAt: value })} />
                  <Input label="Mint end optional" type="datetime-local" value={editForm.publicMintEndAt} onChange={(value) => setEditForm({ ...editForm, publicMintEndAt: value })} />
                  <label className="block text-sm text-muted">
                    Reveal mode
                    <select className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={editForm.revealMode} onChange={(event) => setEditForm({ ...editForm, revealMode: event.target.value as EditForm["revealMode"] })} disabled={Boolean(collection.contractAddress)}>
                      <option value="instant">Instant reveal</option>
                      <option value="delayed">Delayed reveal</option>
                      <option value="placeholder">Placeholder</option>
                    </select>
                  </label>
                  <Input label="Placeholder URI" value={editForm.placeholderUri} onChange={(value) => setEditForm({ ...editForm, placeholderUri: value })} />
                  <Input label="Metadata base URI" value={editForm.metadataBaseUri} onChange={(value) => setEditForm({ ...editForm, metadataBaseUri: value })} disabled={Boolean(collection.contractAddress)} />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-cyan">Deploy / Publish</p>
                  <h2 className="mt-1 text-2xl font-bold">Launch Checklist</h2>
                </div>
                <ChainBadge chainId={collection.chainId} />
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <ChecklistRow label="Metadata ready" value={`${readiness?.metadataReady ?? 0} / ${collection.maxSupply}`} ok={readiness?.metadataReady === collection.maxSupply} />
                <ChecklistRow label="Failed items" value={String(readiness?.failedItems ?? 0)} ok={(readiness?.failedItems ?? 0) === 0} />
                <ChecklistRow label="Missing image IPFS" value={String(readiness?.missingImageIpfs ?? 0)} ok={(readiness?.missingImageIpfs ?? 0) === 0} />
                <ChecklistRow label="Missing metadata JSON" value={String(readiness?.missingMetadata ?? 0)} ok={(readiness?.missingMetadata ?? 0) === 0} />
                <ChecklistRow label="Missing metadata IPFS" value={String(readiness?.missingMetadataIpfs ?? 0)} ok={(readiness?.missingMetadataIpfs ?? 0) === 0} />
                <p className="break-all rounded-md bg-white/5 p-3">Metadata base URI: {readiness?.metadataBaseUri ?? collection.metadataBaseIpfsUri ?? collection.metadataBaseUri ?? collection.baseMetadataUri ?? "Missing"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Expected tokenURI(1): {readiness?.expectedFirstTokenUri ?? "Unavailable"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Expected tokenURI({collection.maxSupply}): {readiness?.expectedLastTokenUri ?? "Unavailable"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Contract: {collection.contractAddress ?? "Not deployed"} ({collection.deploymentTxHash ? "deployed tx saved" : collection.contractAddress ? "deployed" : "not deployed"})</p>
                <p className="break-all rounded-md bg-white/5 p-3">Publish fee: {collection.publishFeeStatus}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Mint price: {collection.mintPrice} ETH | Platform fee: {collection.platformMintFeeBps ?? 250} bps | Creator receive estimate: {creatorReceiveEstimate(collection)} ETH per mint</p>
                <p className="break-all rounded-md bg-white/5 p-3">Mint window: {formatDate(collection.publicMintStartAt)} - {formatDate(collection.publicMintEndAt) || "No end"}</p>
                <p className="break-all rounded-md bg-white/5 p-3">Reveal: {collection.revealMode ?? "instant"} | Revealed: {collection.isRevealed ? "yes" : "no"} | Placeholder: {collection.placeholderUri || "none"}</p>
                {!readiness?.deployable && !collection.contractAddress && <p className="rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-yellow-100">Deploy locked: {readiness?.reason ?? "metadata readiness check is still loading"}</p>}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={isLoading || Boolean(collection.contractAddress) || !readiness?.deployable} onClick={deploy}>Deploy Contract</Button>
                <Button disabled={isLoading || !collection.contractAddress || collection.publishFeeStatus === "verified"} onClick={createPublishQuote}>Create Publish Fee Quote</Button>
                {payment && <Button disabled={isLoading || isPending} onClick={payPublishFee}>Pay Publish Fee</Button>}
                <Button disabled={isLoading || collection.publishFeeStatus !== "verified" || ["published", "minting_live"].includes(collection.status)} onClick={publish}>Publish To Launchpad</Button>
                {["published", "minting_live", "sold_out"].includes(collection.status) && <Link className="rounded-md border border-cyan/40 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10" href={`/launchpad/${collection.slug}`}>Open Mint Page</Link>}
              </div>
              {deployDisabledReason && (
                <p className="mt-3 rounded-md border border-rose/20 bg-rose/10 p-3 text-sm text-rose">
                  Deploy button is disabled because: {deployDisabledReason}
                </p>
              )}
            </div>
            </div>
          )}
        </section>
      </AuthGuard>
    </main>
  );
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toEditForm(collection: Collection): EditForm {
  return {
    name: collection.name,
    symbol: collection.symbol,
    description: collection.description ?? "",
    maxSupply: String(collection.maxSupply ?? 1),
    mintPrice: collection.mintPrice ?? "0",
    maxMintPerWallet: String(collection.maxMintPerWallet ?? 1),
    royaltyBps: String(collection.royaltyBps ?? 500),
    publicMintStartAt: toInputDate(collection.publicMintStartAt) || toInputDate(new Date().toISOString()),
    publicMintEndAt: toInputDate(collection.publicMintEndAt),
    revealMode: (collection.revealMode ?? "instant") as EditForm["revealMode"],
    placeholderUri: collection.placeholderUri ?? "",
    payoutWallet: collection.payoutWallet ?? "",
    metadataBaseUri: collection.metadataBaseIpfsUri ?? collection.metadataBaseUri ?? collection.baseMetadataUri ?? ""
  };
}

function toProfileForm(collection: Collection): ProfileForm {
  return {
    description: collection.description ?? "",
    profileImageUrl: collection.profileImageUrl ?? "",
    bannerImageUrl: collection.bannerImageUrl ?? "",
    websiteUrl: collection.websiteUrl ?? "",
    twitterUrl: collection.twitterUrl ?? "",
    discordUrl: collection.discordUrl ?? "",
    telegramUrl: collection.telegramUrl ?? "",
    externalUrl: collection.externalUrl ?? "",
    creatorDisplayName: collection.creatorDisplayName ?? "",
    creatorBio: collection.creatorBio ?? "",
    creatorAvatarUrl: collection.creatorAvatarUrl ?? ""
  };
}

function Input({ label, value, onChange, type = "text", disabled }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ChecklistRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border p-3 ${ok ? "border-lime/20 bg-lime/10 text-lime" : "border-yellow-300/20 bg-yellow-400/10 text-yellow-100"}`}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function creatorReceiveEstimate(collection: Collection) {
  const price = Number(collection.mintPrice);
  if (!Number.isFinite(price)) return "unavailable";
  const platformBps = collection.platformMintFeeBps ?? 250;
  return (price * (1 - platformBps / 10_000)).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}
