import { AuthShell } from "@/components/auth/AuthShell";
import { WalletLoginButton } from "@/components/auth/WalletLoginButton";

export default function WalletAuthPage() {
  return <AuthShell title="Wallet sign-in" subtitle="Connect your wallet and sign a one-time nonce from NEXMINT AI."><WalletLoginButton /></AuthShell>;
}
