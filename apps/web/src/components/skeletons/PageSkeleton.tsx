export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-7xl space-y-6 py-10">
        {title && <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}
