import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return <AuthShell title="Welcome back" subtitle="Login with email or sign a secure wallet message."><LoginForm /></AuthShell>;
}
