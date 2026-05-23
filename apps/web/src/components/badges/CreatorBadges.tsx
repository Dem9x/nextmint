import { ProBadge } from "./ProBadge";
import { VerifiedBadge } from "./VerifiedBadge";

export function CreatorBadges({
  isVerifiedCreator,
  isVerifiedCollection,
  isProCreator,
  size = "sm",
  compact = true
}: {
  isVerifiedCreator?: boolean;
  isVerifiedCollection?: boolean;
  isProCreator?: boolean;
  size?: "sm" | "md";
  compact?: boolean;
}) {
  const verified = Boolean(isVerifiedCreator || isVerifiedCollection);
  if (!verified && !isProCreator) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 align-middle">
      {verified ? <VerifiedBadge compact={compact} size={size} label={isVerifiedCollection ? "Verified Collection" : "Verified Creator"} /> : null}
      {isProCreator ? <ProBadge compact={compact} size={size} /> : null}
    </span>
  );
}
