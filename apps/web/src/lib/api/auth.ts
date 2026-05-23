import { apiClient, setStoredToken } from "./client";

export type AuthUser = {
  id: string;
  username?: string;
  email?: string;
  walletAddress?: string;
  linkedWallets?: Array<{ address: string; chainId?: number; linkedAt: string; isPrimary: boolean }>;
  walletLinkedAt?: string | null;
  walletVerifiedAt?: string | null;
  role: "user" | "creator" | "admin";
  credits: number;
  paidCredits?: number;
  bonusCredits?: number;
  plan?: "free" | "starter" | "creator" | "pro" | "enterprise";
  activePlan?: "free" | "starter" | "creator" | "pro" | "enterprise";
  planSource?: "user" | "subscription";
  planLimits?: {
    generations?: number;
    maxCollectionSize?: number;
    maxCollectionSupply?: number;
    maxImageSize?: number;
    testnetOnly?: boolean;
    canPublishLaunchpad?: boolean;
    canDeployContract?: boolean;
    marketplaceListingEnabled?: boolean;
    includedLaunchpadPublishes?: number | null;
    priorityQueue?: boolean;
    launchEnabled?: boolean;
    deploymentEnabled?: boolean;
  };
  planStartedAt?: string;
  planExpiresAt?: string | null;
  subscriptionStatus?: "active" | "expired" | "cancelled" | "pending_payment" | "grace_period";
  billingPeriod?: "free" | "monthly" | "yearly" | "custom";
  subscriptionId?: string;
  createdAt?: string;
};

type AuthResponse = { token: string; user: AuthUser };

export async function loginEmail(input: { email: string; password: string }) {
  const result = await apiClient<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  setStoredToken(result.token);
  return result.user;
}

export async function registerEmail(input: { username: string; email: string; password: string; referralCode?: string }) {
  const result = await apiClient<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  setStoredToken(result.token);
  return result.user;
}

export async function fetchMe() {
  return (await apiClient<{ user: AuthUser }>("/api/auth/me")).user;
}

export async function logoutSession() {
  await apiClient("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  setStoredToken(null);
}

export async function requestWalletNonce(input: { walletAddress: string; chainId?: number }) {
  return apiClient<{ walletAddress: string; message: string; nonce: string; expiresAt: string }>("/api/auth/wallet/nonce", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function verifyWallet(input: { walletAddress: string; chainId?: number; signature: `0x${string}`; message: string; connector?: string; referralCode?: string }) {
  const result = await apiClient<AuthResponse>("/api/auth/wallet/verify", { method: "POST", body: JSON.stringify(input) });
  setStoredToken(result.token);
  return result.user;
}
