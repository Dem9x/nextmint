"use client";

import { useEffect, useState } from "react";

export function QuoteExpiryTimer({ expiresAt }: { expiresAt?: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
      const minutes = Math.floor(ms / 60_000);
      const seconds = Math.floor((ms % 60_000) / 1000);
      setRemaining(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return <span>{remaining || "No quote"}</span>;
}
