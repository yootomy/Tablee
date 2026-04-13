import { prisma } from "@/lib/prisma";

export const PREMIUM_FAMILY_TRIAL_DAYS = 7;
export const PREMIUM_SMALL_MONTHLY_PRICE_EUR = 6.99;
export const PREMIUM_LARGE_MONTHLY_PRICE_EUR = 8.99;

export type FamilyPlan = "free" | "premium";
export type BillingTier = "small" | "large";
export type PremiumStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete_expired"
  | "incomplete"
  | "unknown";

export type FamilyEntitlements = {
  plan: FamilyPlan;
  billingTier: BillingTier | null;
  memberCount: number;
  isPremiumActive: boolean;
  status: PremiumStatus | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledTierChange: {
    nextTier: BillingTier;
    nextPriceEur: number;
  } | null;
  currentPriceEur: number | null;
  aiLimits: {
    familyRolling30Day: number;
    familyRolling24h: number | null;
    hiddenProfileRolling24h: number;
  };
  aiUsage: {
    familyRolling30DayUsed: number;
    familyRolling30DayRemaining: number;
    familyRolling24hUsed: number;
    familyRolling24hRemaining: number | null;
  };
  features: {
    importHistory: boolean;
    retryImport: boolean;
    enrichedImportInsights: boolean;
  };
};

const FREE_FAMILY_ROLLING_30_DAY_LIMIT = 5;
const PREMIUM_FAMILY_ROLLING_24_HOUR_LIMIT = 15;
const PREMIUM_FAMILY_ROLLING_30_DAY_LIMIT = 50;
const PROFILE_ROLLING_24_HOUR_LIMIT = 15;

const PREMIUM_ACTIVE_STATUSES = new Set<PremiumStatus>(["trialing", "active"]);

type FamilySubscriptionSnapshot = {
  status: string | null;
  billing_tier: BillingTier | null;
  scheduled_billing_tier: BillingTier | null;
  trial_end_at: Date | null;
  current_period_end_at: Date | null;
  cancel_at_period_end: boolean;
};

export function getBillingTierForMemberCount(memberCount: number): BillingTier {
  return memberCount >= 5 ? "large" : "small";
}

export function getPriceForBillingTier(tier: BillingTier) {
  return tier === "large"
    ? PREMIUM_LARGE_MONTHLY_PRICE_EUR
    : PREMIUM_SMALL_MONTHLY_PRICE_EUR;
}

export function hasPremiumAccess(status: string | null | undefined) {
  if (!status) {
    return false;
  }

  return PREMIUM_ACTIVE_STATUSES.has(status as PremiumStatus);
}

export function getPlanLabel(entitlements: Pick<FamilyEntitlements, "plan" | "billingTier">) {
  if (entitlements.plan !== "premium" || !entitlements.billingTier) {
    return "Free";
  }

  return entitlements.billingTier === "large"
    ? "Premium Famille (5+ membres)"
    : "Premium Famille (1 à 4 membres)";
}

export function getAiQuotaHeadline(entitlements: FamilyEntitlements) {
  if (entitlements.plan === "premium") {
    return `${entitlements.aiUsage.familyRolling24hRemaining ?? 0} imports restants aujourd'hui`;
  }

  return `${entitlements.aiUsage.familyRolling30DayRemaining} imports restants sur 30 jours`;
}

export function deriveScheduledTierChange(
  memberCount: number,
  subscription: FamilySubscriptionSnapshot | null,
) {
  if (!subscription || !hasPremiumAccess(subscription.status)) {
    return null;
  }

  const effectiveTier = subscription.billing_tier ?? getBillingTierForMemberCount(memberCount);
  const desiredTier = getBillingTierForMemberCount(memberCount);
  const scheduledTier = subscription.scheduled_billing_tier;
  const nextTier =
    scheduledTier && scheduledTier !== effectiveTier
      ? scheduledTier
      : desiredTier !== effectiveTier
        ? desiredTier
        : null;

  if (!nextTier) {
    return null;
  }

  return {
    nextTier,
    nextPriceEur: getPriceForBillingTier(nextTier),
  };
}

export async function resolveFamilyEntitlements(
  familyId: string,
): Promise<FamilyEntitlements> {
  const now = Date.now();
  const rolling24hCutoff = new Date(now - 24 * 60 * 60 * 1000);
  const rolling30DayCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [memberCount, subscription, familyRolling30DayUsed, familyRolling24hUsed] =
    await Promise.all([
      prisma.family_members.count({
        where: { family_id: familyId },
      }),
      prisma.family_subscriptions.findUnique({
        where: { family_id: familyId },
        select: {
          status: true,
          billing_tier: true,
          scheduled_billing_tier: true,
          trial_end_at: true,
          current_period_end_at: true,
          cancel_at_period_end: true,
        },
      }),
      prisma.recipe_import_jobs.count({
        where: {
          family_id: familyId,
          created_at: { gte: rolling30DayCutoff },
        },
      }),
      prisma.recipe_import_jobs.count({
        where: {
          family_id: familyId,
          created_at: { gte: rolling24hCutoff },
        },
      }),
    ]);

  const status = (subscription?.status ?? null) as PremiumStatus | null;
  const isPremiumActive = hasPremiumAccess(status);
  const subscriptionSnapshot = subscription
    ? {
        status: subscription.status,
        billing_tier: subscription.billing_tier as BillingTier | null,
        scheduled_billing_tier:
          subscription.scheduled_billing_tier as BillingTier | null,
        trial_end_at: subscription.trial_end_at,
        current_period_end_at: subscription.current_period_end_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
      }
    : null;
  const billingTier = isPremiumActive
    ? ((subscription?.billing_tier as BillingTier | null) ??
      getBillingTierForMemberCount(memberCount))
    : null;
  const plan: FamilyPlan = isPremiumActive ? "premium" : "free";
  const familyRolling30DayLimit = isPremiumActive
    ? PREMIUM_FAMILY_ROLLING_30_DAY_LIMIT
    : FREE_FAMILY_ROLLING_30_DAY_LIMIT;
  const familyRolling24hLimit = isPremiumActive
    ? PREMIUM_FAMILY_ROLLING_24_HOUR_LIMIT
    : null;

  return {
    plan,
    billingTier,
    memberCount,
    isPremiumActive,
    status,
    trialEndsAt: subscription?.trial_end_at?.toISOString() ?? null,
    currentPeriodEndsAt: subscription?.current_period_end_at?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    scheduledTierChange: deriveScheduledTierChange(memberCount, subscriptionSnapshot),
    currentPriceEur: billingTier ? getPriceForBillingTier(billingTier) : null,
    aiLimits: {
      familyRolling30Day: familyRolling30DayLimit,
      familyRolling24h: familyRolling24hLimit,
      hiddenProfileRolling24h: PROFILE_ROLLING_24_HOUR_LIMIT,
    },
    aiUsage: {
      familyRolling30DayUsed,
      familyRolling30DayRemaining: Math.max(
        0,
        familyRolling30DayLimit - familyRolling30DayUsed,
      ),
      familyRolling24hUsed,
      familyRolling24hRemaining:
        familyRolling24hLimit === null
          ? null
          : Math.max(0, familyRolling24hLimit - familyRolling24hUsed),
    },
    features: {
      importHistory: isPremiumActive,
      retryImport: isPremiumActive,
      enrichedImportInsights: isPremiumActive,
    },
  };
}

export async function countProfileImportsInRolling24Hours(profileId: string) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return prisma.recipe_import_jobs.count({
    where: {
      requested_by_profile_id: profileId,
      created_at: { gte: cutoff },
    },
  });
}
