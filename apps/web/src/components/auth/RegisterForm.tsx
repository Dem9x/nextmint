"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { WalletLoginButton } from "./WalletLoginButton";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) throw new Error("Passwords do not match");
    await register({ username, email, password, referralCode: params.get("ref") ?? undefined });
    router.push("/dashboard");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" type="password" placeholder="Password (min 10 chars)" value={password} onChange={(event) => setPassword(event.target.value)} />
      <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" type="password" placeholder="Confirm password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      {password && password.length < 10 && <p className="text-sm text-yellow-100">Password must be at least 10 characters.</p>}
      {confirm && password !== confirm && <p className="text-sm text-rose">Passwords do not match.</p>}
      {error && <p className="rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
      <Button className="w-full" disabled={isLoading || password !== confirm || password.length < 10}>{isLoading ? "Creating account..." : "Register"}</Button>
      <WalletLoginButton label="Register with wallet" onSuccess={() => router.push("/dashboard")} />
      <p className="text-center text-sm text-muted">Already registered? <Link className="text-cyan" href="/auth/login">Login</Link></p>
    </form>
  );
}
