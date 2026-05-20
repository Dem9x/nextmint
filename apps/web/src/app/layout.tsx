
// @ts-ignore: CSS module side-effect import

import "./globals.css";
// @ts-ignore: CSS module side-effect import
import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXMINT AI",
  description: "AI-powered Web3 NFT Generator and Launchpad"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
