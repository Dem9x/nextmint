"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);
  return <>{children}</>;
}
