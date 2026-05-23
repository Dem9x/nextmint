"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CheckCircle2, Link2, ShieldCheck, Unlink, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { shortAddress } from "@/lib/format/marketplace";
import { useAuthStore } from "@/stores/auth.store";

type LinkedWallet = {
  address: string;
  chainId?: number;
  linkedAt: string;
  isPrimary: boolean;
};

type WalletProfile = {
  walletAddress: string | null;
  linkedWallets: LinkedWallet[];
  walletLinkedAt: string | null;
  walletVerifiedAt: string | null;
};

const emptyWalletProfile: WalletProfile = {
  walletAddress: null,
  linkedWallets: [],
  walletLinkedAt: null,
  walletVerifiedAt: null
};

function sameAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function WalletLinkPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [profile, setProfile] = useState<WalletProfile>(emptyWalletProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const linkedWallet = profile.walletAddress ?? user?.walletAddress ?? null;
  const connectedMatchesLinked = useMemo(() => sameAddress(address, linkedWallet), [address, linkedWallet]);
  const connectedIsDifferent = Boolean(isConnected && address && linkedWallet && !connectedMatchesLinked);

  useEffect(() => {
    api<WalletProfile>("/api/users/me/wallet")
      .then((nextProfile) => setProfile(nextProfile))
      .catch(() => setProfile(emptyWalletProfile))
      .finally(() => setIsLoading(false));
  }, []);

  async function refreshProfile() {
    const nextProfile = await api<WalletProfile>("/api/users/me/wallet");
    setProfile(nextProfile);
    await fetchMe();
  }

  async function linkConnectedWallet() {
    if (!address) {
      setError("Please connect a wallet first.");
      return;
    }

    setIsMutating(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const challenge = await api<{ message: string; nonce: string; expiresAt: string }>("/api/users/wallet-link/challenge", {
        method: "POST",
        body: JSON.stringify({ address, chainId })
      });
      const signature = await signMessageAsync({ message: challenge.message });
      await api<{ user: unknown }>("/api/users/wallet-link/verify", {
        method: "POST",
        body: JSON.stringify({ address, chainId, signature, nonce: challenge.nonce })
      });
      await refreshProfile();
      setMessage("Primary wallet linked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signature rejected.");
    } finally {
      setIsMutating(false);
    }
  }

  async function unlinkWallet() {
    setIsMutating(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await api("/api/users/wallet-link", { method: "DELETE" });
      await refreshProfile();
      setMessage("Wallet unlinked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlink wallet.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-cyan">Linked Wallet</p>
          <h2 className="mt-1 text-2xl font-black">Account Wallet</h2>
        </div>
        <span className="rounded-full border border-cyan/25 bg-cyan/10 p-2 text-cyan">
          <Wallet size={18} />
        </span>
      </div>

      <p className="mt-3 text-sm text-muted">
        Your wallet proves ownership for minting, marketplace actions, likes, creator payouts, and collection management.
      </p>

      {user?.email ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="text-muted">Signed in as</p>
          <p className="mt-1 font-semibold">{user.email}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-md bg-white/5" />
        ) : linkedWallet ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lime">
              <CheckCircle2 size={16} />
              <span className="text-sm font-bold">Primary wallet linked</span>
            </div>
            <div>
              <p className="text-xs uppercase text-muted">Wallet</p>
              <p className="font-mono text-sm font-bold">{shortAddress(linkedWallet)}</p>
            </div>
            <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
              <span>Linked: {formatDate(profile.walletLinkedAt ?? user?.walletLinkedAt)}</span>
              <span>Verified: {formatDate(profile.walletVerifiedAt ?? user?.walletVerifiedAt)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No wallet linked yet.</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-cyan/20 bg-cyan/10 p-3 text-xs text-cyan">
        <div className="flex items-start gap-2">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <p>Signing this message only links your wallet to your NEXMINT account. It does not cost gas and does not authorize any transaction.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {!isConnected ? <ConnectButton /> : null}
        {isConnected && address ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <p className="text-muted">Connected wallet</p>
            <p className="mt-1 font-mono font-bold">{shortAddress(address)}</p>
            {connectedIsDifferent ? <p className="mt-2 text-xs text-amber-300">Connected wallet does not match your linked wallet.</p> : null}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={linkConnectedWallet} disabled={!isConnected || !address || isMutating || connectedMatchesLinked} className="gap-2">
            <Link2 size={16} />
            {linkedWallet ? "Link This Wallet" : "Link Connected Wallet"}
          </Button>
          <Button onClick={unlinkWallet} disabled={!linkedWallet || isMutating} className="gap-2 border border-rose/30 bg-rose/10 text-rose hover:bg-rose/20">
            <Unlink size={16} />
            Unlink Wallet
          </Button>
        </div>
      </div>

      {message ? <p className="mt-3 rounded-md border border-lime/30 bg-lime/10 p-3 text-sm text-lime">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
    </section>
  );
}
