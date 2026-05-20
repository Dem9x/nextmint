export function CardGridSkeleton() {
  return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-white/10" />)}</div>;
}
