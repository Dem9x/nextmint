const PUBLIC_PLAN_BADGES = ["free", "starter", "creator", "pro", "enterprise"] as const;

type PublicPlanBadge = (typeof PUBLIC_PLAN_BADGES)[number] | null;

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isProCreatorPlan(plan?: unknown) {
  return plan === "pro" || plan === "enterprise";
}

export function publicPlanBadge(plan?: unknown): PublicPlanBadge {
  return PUBLIC_PLAN_BADGES.includes(plan as any) ? plan as PublicPlanBadge : null;
}

export function buildPublicCreator(user?: any) {
  if (!user) return undefined;
  const plan = user.currentPlan ?? user.plan;
  return {
    id: user._id ? String(user._id) : undefined,
    displayName: stringOrUndefined(user.displayName) ?? stringOrUndefined(user.username),
    walletAddress: stringOrUndefined(user.walletAddress) ?? stringOrUndefined(user.primaryWalletAddress) ?? stringOrUndefined(user.primaryWallet),
    avatarUrl: stringOrUndefined(user.avatarUrl),
    isVerifiedCreator: Boolean(user.isVerifiedCreator),
    creatorBadge: user.creatorBadge ?? "none",
    activePlanPublicBadge: publicPlanBadge(plan),
    isProCreator: isProCreatorPlan(plan)
  };
}

export function buildCollectionBadgeState(collection?: any, creator?: any) {
  const publicCreator = buildPublicCreator(creator);
  const isVerifiedCollection = Boolean(collection?.isVerifiedCollection);
  return {
    creatorProfile: publicCreator,
    isVerifiedCollection,
    collectionBadge: collection?.collectionBadge ?? "none",
    isVerifiedCreator: Boolean(publicCreator?.isVerifiedCreator),
    isProCreator: Boolean(publicCreator?.isProCreator)
  };
}
