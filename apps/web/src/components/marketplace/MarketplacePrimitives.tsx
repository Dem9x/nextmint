import Link from "next/link";
import { ChevronDown, ExternalLink, ImageIcon } from "lucide-react";
import { type ReactNode } from "react";
import { CreatorBadges } from "@/components/badges/CreatorBadges";
import { formatMarketplaceDate, formatWeiEth, shortAddress } from "@/lib/format/marketplace";

export function MarketplaceBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "cyan" | "lime" | "rose" }) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.04] text-muted",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    lime: "border-lime/30 bg-lime/10 text-lime",
    rose: "border-rose/30 bg-rose/10 text-rose"
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${toneClass}`}>{children}</span>;
}

export function MarketplaceStat({ label, value, helper }: { label: string; value: ReactNode; helper?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel/90 p-4 shadow-[0_16px_45px_rgba(0,0,0,.22)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
      {helper ? <p className="mt-2 text-[11px] leading-4 text-muted">{helper}</p> : null}
    </div>
  );
}

export function MarketplaceEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-10 text-center">
      <p className="text-lg font-black">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function NftListingCard({
  href,
  image,
  name,
  collectionName,
  price,
  seller,
  status,
  rarity,
  isVerifiedCreator,
  isVerifiedCollection,
  isProCreator
}: {
  href: string;
  image?: string;
  name: string;
  collectionName?: string;
  price?: string | null;
  seller?: string;
  status?: string;
  rarity?: string;
  isVerifiedCreator?: boolean;
  isVerifiedCollection?: boolean;
  isProCreator?: boolean;
}) {
  return (
    <Link href={href} className="group overflow-hidden rounded-xl border border-white/10 bg-panel transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-[0_24px_60px_rgba(34,211,238,.08)]">
      <div className="relative aspect-square bg-black/40">
        {image ? <img src={image} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" /> : <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>}
        {status ? <div className="absolute left-3 top-3"><MarketplaceBadge tone={status === "Listed" ? "lime" : "neutral"}>{status}</MarketplaceBadge></div> : null}
      </div>
      <div className="p-4">
        {collectionName ? (
          <div className="mb-1 flex min-w-0 items-center gap-1.5">
            <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-cyan">{collectionName}</p>
            <CreatorBadges isVerifiedCreator={isVerifiedCreator} isVerifiedCollection={isVerifiedCollection} isProCreator={isProCreator} />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate font-black">{name}</p>
          {rarity ? <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted">{rarity}</span> : null}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Price</p>
            <p className="mt-1 font-black text-cyan">{formatWeiEth(price)}</p>
          </div>
          {seller ? <p className="text-xs text-muted">{shortAddress(seller)}</p> : null}
        </div>
      </div>
    </Link>
  );
}

export function ActivityFeedItem({
  label,
  walletLabel,
  timestamp,
  txUrl,
  image
}: {
  label: string;
  walletLabel: string;
  timestamp?: string;
  txUrl?: string;
  image?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={18} className="text-muted" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{label}</p>
        <p className="mt-1 text-xs text-muted">{walletLabel}{timestamp ? ` - ${formatMarketplaceDate(timestamp)}` : ""}</p>
      </div>
      {txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="shrink-0 text-cyan hover:text-white" aria-label="View transaction"><ExternalLink size={16} /></a> : null}
    </div>
  );
}

export function FilterPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-panel p-4 lg:sticky lg:top-24 lg:self-start">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">Filters</p>
      <div className="mt-4 space-y-3">{children}</div>
    </aside>
  );
}

export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
        {title}
        <ChevronDown size={16} className="text-muted" />
      </summary>
      <div className="mt-3 space-y-2 text-sm text-muted">{children}</div>
    </details>
  );
}
