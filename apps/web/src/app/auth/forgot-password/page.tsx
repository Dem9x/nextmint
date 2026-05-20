import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  return <AuthShell title="Password recovery" subtitle="Email password recovery is not enabled yet. Use wallet login if your wallet is connected."><p className="text-sm text-muted">Ask an admin to enable SMTP before using password reset.</p></AuthShell>;
}
