import { SiteHeader } from "@/components/site-header";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-4xl font-black">Documentation</h1>
        <p className="mt-4 text-muted">NEXMINT AI exposes REST APIs for wallet auth, generation, collections, IPFS, contracts, crypto payments, subscriptions, and admin analytics.</p>
        <pre className="mt-6 overflow-auto rounded-lg border border-white/10 bg-black/50 p-4 text-sm">{`POST /api/crypto/create-payment
POST /api/crypto/verify-payment
GET  /api/crypto/history
POST /api/generate
POST /api/contracts/deploy`}</pre>
      </article>
    </main>
  );
}
