import Link from "next/link";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(132,204,22,0.12),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-cyan/20 bg-panel/80 p-6 shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <Link href="/" className="text-lg font-black tracking-wide text-white">NEXMINT AI</Link>
          <h1 className="mt-8 text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
