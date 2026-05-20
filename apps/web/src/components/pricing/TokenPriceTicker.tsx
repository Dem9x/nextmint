export function TokenPriceTicker({ prices }: { prices: Array<{ tokenSymbol: string; priceUsd: number; provider: string; updatedAt?: string }> }) {
  if (!prices.length) return <div className="rounded-lg border border-white/10 bg-panel p-4 text-sm text-muted">No cached token prices yet. Refresh a quote to populate prices.</div>;
  return (
    <div className="flex gap-3 overflow-x-auto rounded-lg border border-white/10 bg-panel p-4 text-sm">
      {prices.map((price) => <span key={`${price.tokenSymbol}-${price.provider}`} className="whitespace-nowrap rounded-md bg-white/5 px-3 py-2">{price.tokenSymbol}: ${price.priceUsd.toFixed(2)} via {price.provider}</span>)}
    </div>
  );
}
