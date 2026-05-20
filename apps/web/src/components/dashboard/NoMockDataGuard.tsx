"use client";

import { useEffect } from "react";

export function NoMockDataGuard({ source, children }: { source: "api"; children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && source !== "api") {
      console.warn("NEXMINT dashboard received non-API data. Mock dashboard values are not allowed.");
    }
  }, [source]);
  return <>{children}</>;
}
