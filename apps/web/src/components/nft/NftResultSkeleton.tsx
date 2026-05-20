export function NftResultSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[520px_1fr]">
      <div className="aspect-square animate-pulse rounded-xl border border-white/10 bg-white/[0.06]" />
      <div className="space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-white/[0.08]" />
        <div className="h-20 animate-pulse rounded-md bg-white/[0.06]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-md bg-white/[0.06]" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-11 animate-pulse rounded-md bg-white/[0.08]" />)}
        </div>
      </div>
    </div>
  );
}
