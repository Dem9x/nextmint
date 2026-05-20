"use client";

import { create } from "zustand";
import { getStoredToken, setStoredToken } from "@/lib/api/client";
import { fetchMe, loginEmail, logoutSession, registerEmail, requestWalletNonce, verifyWallet, type AuthUser } from "@/lib/api/auth";
import { withMinimumDelay } from "@/lib/loading";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchMe: () => Promise<AuthUser | null>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: { username: string; email: string; password: string; referralCode?: string }) => Promise<AuthUser>;
  loginWithWallet: (input: { walletAddress: string; chainId?: number; signMessage: (message: string) => Promise<`0x${string}`>; connector?: string; referralCode?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  fetchMe: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return null;
    }
    try {
      set({ isLoading: true, error: null, token });
      const user = await withMinimumDelay(fetchMe());
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      setStoredToken(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: error instanceof Error ? error.message : "Session expired" });
      return null;
    }
  },
  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const user = await withMinimumDelay(loginEmail(input));
      set({ user, token: getStoredToken(), isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Login failed" });
      throw error;
    }
  },
  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const user = await withMinimumDelay(registerEmail(input));
      set({ user, token: getStoredToken(), isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Registration failed" });
      throw error;
    }
  },
  loginWithWallet: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const nonce = await withMinimumDelay(requestWalletNonce({ walletAddress: input.walletAddress, chainId: input.chainId }));
      const signature = await input.signMessage(nonce.message);
      const user = await withMinimumDelay(verifyWallet({ walletAddress: input.walletAddress, chainId: input.chainId, signature, message: nonce.message, connector: input.connector, referralCode: input.referralCode }));
      set({ user, token: getStoredToken(), isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Wallet login failed" });
      throw error;
    }
  },
  logout: async () => {
    await logoutSession();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null });
  }
}));

export function useAuthSnapshot() {
  return useAuthStore.getState();
}
