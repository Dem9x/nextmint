export function TokenSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select className="rounded-md border border-white/10 bg-black/40 p-3" value={value} onChange={(event) => onChange(event.target.value)}>
      {["NATIVE", "USDC", "USDT", "DAI"].map((token) => <option key={token} value={token}>{token}</option>)}
    </select>
  );
}
