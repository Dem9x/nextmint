export function TableSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-white/10" />)}</div>;
}
