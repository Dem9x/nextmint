export function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return <div className="rounded-lg border border-rose/30 bg-rose/10 p-5 text-rose">{message}</div>;
}
