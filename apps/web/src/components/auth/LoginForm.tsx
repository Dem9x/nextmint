"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { WalletLoginButton } from "./WalletLoginButton";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await login({ email, password });
    router.push("/dashboard");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
      <Button className="w-full" disabled={isLoading}>{isLoading ? "Logging in..." : "Login"}</Button>
      <WalletLoginButton onSuccess={() => router.push("/dashboard")} />
      <button type="button" disabled className="w-full rounded-md border border-white/10 px-4 py-2 text-sm text-muted">Google login unavailable until OAuth is configured</button>
      <p className="text-center text-sm text-muted">No account? <Link className="text-cyan" href="/auth/register">Register</Link></p>
    </form>
  );
}
