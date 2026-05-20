import { QuoteExpiryTimer } from "./QuoteExpiryTimer";

export function PriceBreakdownCard({ quote }: { quote?: { usdAmount: number; token: string; tokenAmount: string; priceUsd: number; provider: string; expiresAt: string; isFallback: boolean; contractAddress?: string; treasuryAddress?: string } }) {
  if (!quote) return <div className="rounded-lg border border-white/10 bg-panel p-5 text-sm text-muted">Select a plan and refresh quote.</div>;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <h3 className="font-bold">Price Breakdown</h3>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>Base price</span><span>${quote.usdAmount.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>{quote.token} price</span><span>${quote.priceUsd.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Required payment</span><span>{quote.tokenAmount} {quote.token}</span></div>
        <div className="flex justify-between"><span>Platform fee</span><span>included</span></div>
        <div className="flex justify-between"><span>Quote expires in</span><QuoteExpiryTimer expiresAt={quote.expiresAt} /></div>
        <div className="flex justify-between"><span>Provider</span><span>{quote.provider}{quote.isFallback ? " fallback" : ""}</span></div>
        <div className="flex justify-between"><span>Gas</span><span>estimated in wallet</span></div>
      </div>
      {quote.contractAddress && <p className="mt-4 break-all text-xs text-muted">Payment contract: {quote.contractAddress}</p>}
      {quote.treasuryAddress && <p className="mt-2 break-all text-xs text-muted">Treasury: {quote.treasuryAddress}</p>}
    </div>
  );
}
