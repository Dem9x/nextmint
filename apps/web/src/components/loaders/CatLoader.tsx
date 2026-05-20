"use client";

export function CatLoader({ text = "Booting the mint engine...", subtext }: { text?: string; subtext?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan/20 bg-panel/80 p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.12)]">
      <div className="relative h-24 w-28">
        <div className="absolute left-3 top-0 h-9 w-9 rotate-45 rounded-sm border-l border-t border-cyan bg-black shadow-[0_0_18px_rgba(34,211,238,0.5)]" />
        <div className="absolute right-3 top-0 h-9 w-9 rotate-45 rounded-sm border-r border-t border-cyan bg-black shadow-[0_0_18px_rgba(34,211,238,0.5)]" />
        <div className="absolute inset-x-2 top-5 h-20 rounded-[45%] border border-cyan/50 bg-black/80 shadow-[0_0_34px_rgba(34,211,238,0.35)]" />
        <div className="absolute left-9 top-12 h-2 w-2 animate-pulse rounded-full bg-lime shadow-[0_0_14px_#84cc16]" />
        <div className="absolute right-9 top-12 h-2 w-2 animate-pulse rounded-full bg-lime shadow-[0_0_14px_#84cc16]" />
        <div className="absolute left-1 top-16 h-px w-10 origin-right animate-[pulse_1.3s_ease-in-out_infinite] bg-cyan/80" />
        <div className="absolute right-1 top-16 h-px w-10 origin-left animate-[pulse_1.3s_ease-in-out_infinite] bg-cyan/80" />
        <div className="absolute -right-2 top-1 h-3 w-3 animate-ping rounded-full bg-cyan/70" />
        <div className="absolute -left-3 bottom-2 h-2 w-2 animate-ping rounded-full bg-lime/70 [animation-delay:400ms]" />
      </div>
      <p className="mt-4 text-lg font-black">{text}</p>
      {subtext && <p className="mt-2 max-w-md text-sm text-muted">{subtext}</p>}
      <div className="mt-5 h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-[shimmer_1.2s_linear_infinite] rounded-full bg-gradient-to-r from-cyan via-lime to-cyan" />
      </div>
    </div>
  );
}
