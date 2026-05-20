"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#22d3ee", borderRadius: "small" })}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
