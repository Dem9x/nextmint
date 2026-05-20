import Link from "next/link";
export function AuthRequiredState() {
  return <div className="rounded-lg border border-cyan/30 bg-cyan/10 p-5 text-cyan">Authentication required. <Link className="underline" href="/auth/login">Login</Link></div>;
}
