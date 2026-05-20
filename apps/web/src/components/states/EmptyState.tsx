export function EmptyState({ message = "No data yet." }: { message?: string }) {
  return <div className="rounded-lg border border-white/10 bg-panel p-5 text-muted">{message}</div>;
}
