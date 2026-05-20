import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthSkeleton } from "@/components/skeletons/AuthSkeleton";

export default function RegisterPage() {
  return <AuthShell title="Create account" subtitle="Register to generate, prepare, and mint real NFTs."><Suspense fallback={<AuthSkeleton />}><RegisterForm /></Suspense></AuthShell>;
}
