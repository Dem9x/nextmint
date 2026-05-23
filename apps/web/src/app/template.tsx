"use client";

import { useEffect, useState } from "react";
import NFTDominoLoading from "@/components/loaders/DominoEffect";

const ROUTE_LOADER_MS = 5000;

export default function Template({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoader(false), ROUTE_LOADER_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (showLoader) return <NFTDominoLoading />;
  return <>{children}</>;
}
