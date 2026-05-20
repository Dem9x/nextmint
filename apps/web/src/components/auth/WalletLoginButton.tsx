"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";

export function WalletLoginButton({ label = "Sign in with wallet", onSuccess }: { label?: string; onSuccess?: () => void }) {
  const { address, chainId, connector, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const loginWithWallet = useAuthStore((state) => state.loginWithWallet);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  if (!isConnected || !address) return <ConnectButton />;

  async function signIn() {
    if (!address) return;
    await loginWithWallet({ walletAddress: address, chainId, connector: connector?.name?.toLowerCase(), signMessage: (message) => signMessageAsync({ message }) });
    onSuccess?.();
  }

  return (
    <div>
      <Button className="w-full" disabled={isLoading} onClick={() => void signIn()}>{isLoading ? "Signing..." : label}</Button>
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}
    </div>
  );
}
