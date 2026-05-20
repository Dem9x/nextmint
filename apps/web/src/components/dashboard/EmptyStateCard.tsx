export function EmptyStateCard({ title = "No data yet", description = "Real records will appear here after verified activity." }: { title?: string; description?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5 text-sm text-muted">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}
