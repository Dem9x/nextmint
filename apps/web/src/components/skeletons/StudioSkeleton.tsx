export function StudioSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[440px_1fr]">
      <div className="space-y-5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />)}</div>
      <div className="space-y-5"><div className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" /><div className="aspect-square animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" /></div>
    </div>
  );
}
