"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ForbiddenState } from "@/components/states/ForbiddenState";
import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <DashboardSkeleton />;
  if (!isAuthenticated) return <DashboardSkeleton />;
  if (adminOnly && user?.role !== "admin") return <ForbiddenState />;
  return <>{children}</>;
}
