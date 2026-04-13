import Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildAppUrl } from "@/lib/app-url";
import {
  getBillingTierForMemberCount,
  getPriceForBillingTier,
  hasPremiumAccess,
  PREMIUM_FAMILY_TRIAL_DAYS,
  type BillingTier,
} from "@/lib/family-billing";

let stripeClient: Stripe | null = null;

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

function getRequiredStripeSecretKey() {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
  }

  return secretKey;
}

function getStripePriceIdForTier(tier: BillingTier) {
  const priceId =
    tier === "large"
      ? process.env.STRIPE_PRICE_ID_PREMIUM_LARGE_MONTHLY
      : process.env.STRIPE_PRICE_ID_PREMIUM_SMALL_MONTHLY;

  if (!priceId?.trim()) {
    throw new Error(
      tier === "large"
        ? "STRIPE_PRICE_ID_PREMIUM_LARGE_MONTHLY n'est pas configurée."
        : "STRIPE_PRICE_ID_PREMIUM_SMALL_MONTHLY n'est pas configurée.",
    );
  }

  return priceId.trim();
}

export function isStripeConfigured() {
  return Boolean(
    getStripeSecretKey() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PREMIUM_SMALL_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_ID_PREMIUM_LARGE_MONTHLY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredStripeSecretKey(), {
      apiVersion: "2026-03-25.dahlia",
    });
  }

  return stripeClient;
}

export function getPriceIdForBillingTier(tier: BillingTier) {
  return getStripePriceIdForTier(tier);
}

export function getBillingTierFromPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM_SMALL_MONTHLY?.trim()) {
    return "small" satisfies BillingTier;
  }

  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM_LARGE_MONTHLY?.trim()) {
    return "large" satisfies BillingTier;
  }

  return null;
}

async function getStripeCustomerForFamily(familyId: string) {
  const account = await prisma.family_billing_accounts.findUnique({
    where: { family_id: familyId },
  });

  if (!account) {
    return null;
  }

  return account;
}

export async function ensureStripeCustomerForFamily(input: {
  familyId: string;
  familyName: string;
  billingEmail: string | null;
}) {
  const existingAccount = await getStripeCustomerForFamily(input.familyId);

  if (existingAccount) {
    return existingAccount;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: input.familyName,
    email: input.billingEmail ?? undefined,
    metadata: {
      familyId: input.familyId,
    },
  });

  return prisma.family_billing_accounts.create({
    data: {
      family_id: input.familyId,
      stripe_customer_id: customer.id,
      billing_email: input.billingEmail ?? undefined,
    },
  });
}

export async function createFamilyCheckoutSession(input: {
  familyId: string;
  familyName: string;
  memberCount: number;
  billingEmail: string | null;
}) {
  const billingTier = getBillingTierForMemberCount(input.memberCount);
  const priceId = getPriceIdForBillingTier(billingTier);
  const account = await ensureStripeCustomerForFamily(input);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: account.stripe_customer_id,
    success_url: buildAppUrl("/profile/billing?checkout=success"),
    cancel_url: buildAppUrl("/profile/billing?checkout=canceled"),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: PREMIUM_FAMILY_TRIAL_DAYS,
      metadata: {
        familyId: input.familyId,
        billingTier,
      },
    },
    metadata: {
      familyId: input.familyId,
      billingTier,
    },
    billing_address_collection: "auto",
    allow_promotion_codes: false,
    customer_update: {
      name: "auto",
      address: "auto",
    },
    payment_method_collection: "always",
  });

  if (!session.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de checkout.");
  }

  return session.url;
}

export async function createFamilyBillingPortalSession(familyId: string) {
  const account = await getStripeCustomerForFamily(familyId);

  if (!account) {
    throw new Error("Aucun compte de facturation n'est encore configuré pour cette famille.");
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: buildAppUrl("/profile/billing"),
  });

  return session.url;
}

async function updateStripeSubscriptionPrice(input: {
  stripeSubscriptionId: string;
  nextTier: BillingTier;
}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(input.stripeSubscriptionId, {
    expand: ["items.data.price"],
  });
  const item = subscription.items.data[0];

  if (!item) {
    throw new Error("Aucune ligne d'abonnement Stripe n'a été trouvée.");
  }

  const nextPriceId = getPriceIdForBillingTier(input.nextTier);

  await stripe.subscriptions.update(input.stripeSubscriptionId, {
    items: [
      {
        id: item.id,
        price: nextPriceId,
      },
    ],
    proration_behavior: "none",
  });

  return nextPriceId;
}

export async function syncFamilySubscriptionTierForMemberCount(familyId: string) {
  if (!isStripeConfigured()) {
    return;
  }

  const [memberCount, subscription] = await Promise.all([
    prisma.family_members.count({
      where: { family_id: familyId },
    }),
    prisma.family_subscriptions.findUnique({
      where: { family_id: familyId },
    }),
  ]);

  if (!subscription || !subscription.stripe_subscription_id) {
    return;
  }

  if (!hasPremiumAccess(subscription.status)) {
    return;
  }

  if (subscription.cancel_at_period_end) {
    return;
  }

  const desiredTier = getBillingTierForMemberCount(memberCount);
  const currentTier = subscription.billing_tier as BillingTier | null;
  const scheduledTier = subscription.scheduled_billing_tier as BillingTier | null;
  const shouldClearSchedule = desiredTier === currentTier && scheduledTier;
  const shouldScheduleNextTier = desiredTier !== currentTier;

  if (!shouldClearSchedule && !shouldScheduleNextTier) {
    return;
  }

  const nextPriceId = await updateStripeSubscriptionPrice({
    stripeSubscriptionId: subscription.stripe_subscription_id,
    nextTier: desiredTier,
  });

  await prisma.family_subscriptions.update({
    where: { family_id: familyId },
    data: shouldClearSchedule
      ? {
          scheduled_billing_tier: null,
          stripe_price_id_scheduled: null,
          updated_at: new Date(),
        }
      : {
          scheduled_billing_tier: desiredTier,
          stripe_price_id_scheduled: nextPriceId,
          updated_at: new Date(),
        },
  });
}

export function getPriceSummaryForMemberCount(memberCount: number) {
  const tier = getBillingTierForMemberCount(memberCount);

  return {
    tier,
    priceEur: getPriceForBillingTier(tier),
  };
}

function isLaterPeriodEnd(
  previousPeriodEndAt: Date | null,
  nextPeriodEndAt: Date | null,
) {
  if (!previousPeriodEndAt || !nextPeriodEndAt) {
    return false;
  }

  return nextPeriodEndAt.getTime() > previousPeriodEndAt.getTime();
}

export async function resolveFamilyIdFromStripeContext(input: {
  familyIdHint?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  if (input.familyIdHint) {
    return input.familyIdHint;
  }

  if (input.stripeSubscriptionId) {
    const existingSubscription = await prisma.family_subscriptions.findFirst({
      where: { stripe_subscription_id: input.stripeSubscriptionId },
      select: { family_id: true },
    });

    if (existingSubscription) {
      return existingSubscription.family_id;
    }
  }

  if (input.stripeCustomerId) {
    const billingAccount = await prisma.family_billing_accounts.findFirst({
      where: { stripe_customer_id: input.stripeCustomerId },
      select: { family_id: true },
    });

    if (billingAccount) {
      return billingAccount.family_id;
    }
  }

  return null;
}

export async function applyStripeSubscriptionSnapshot(input: {
  familyId: string;
  stripeCustomerId?: string | null;
  billingEmail?: string | null;
  stripeSubscriptionId: string;
  stripePriceIdCurrent: string | null;
  status: string;
  trialEndAt: Date | null;
  currentPeriodEndAt: Date | null;
  cancelAtPeriodEnd: boolean;
}) {
  const incomingTier = getBillingTierFromPriceId(input.stripePriceIdCurrent);
  const [existingBillingAccount, existingSubscription] = await Promise.all([
    prisma.family_billing_accounts.findUnique({
      where: { family_id: input.familyId },
    }),
    prisma.family_subscriptions.findUnique({
      where: { family_id: input.familyId },
    }),
  ]);

  let billingAccountId = existingBillingAccount?.id ?? null;

  if (!existingBillingAccount && input.stripeCustomerId) {
    const createdAccount = await prisma.family_billing_accounts.create({
      data: {
        family_id: input.familyId,
        stripe_customer_id: input.stripeCustomerId,
        billing_email: input.billingEmail ?? undefined,
      },
    });

    billingAccountId = createdAccount.id;
  } else if (
    existingBillingAccount &&
    (input.stripeCustomerId || input.billingEmail) &&
    (existingBillingAccount.stripe_customer_id !== input.stripeCustomerId ||
      existingBillingAccount.billing_email !== (input.billingEmail ?? null))
  ) {
    const updatedAccount = await prisma.family_billing_accounts.update({
      where: { id: existingBillingAccount.id },
      data: {
        stripe_customer_id:
          input.stripeCustomerId ?? existingBillingAccount.stripe_customer_id,
        billing_email: input.billingEmail ?? existingBillingAccount.billing_email,
      },
    });

    billingAccountId = updatedAccount.id;
  }

  const periodAdvanced = isLaterPeriodEnd(
    existingSubscription?.current_period_end_at ?? null,
    input.currentPeriodEndAt,
  );
  const existingScheduledPriceId = existingSubscription?.stripe_price_id_scheduled ?? null;
  const existingScheduledTier =
    (existingSubscription?.scheduled_billing_tier as BillingTier | null) ?? null;
  const shouldPromoteScheduledTier =
    Boolean(existingSubscription) &&
    periodAdvanced &&
    Boolean(existingScheduledTier) &&
    Boolean(existingScheduledPriceId) &&
    existingScheduledPriceId === input.stripePriceIdCurrent;

  const currentTier = shouldPromoteScheduledTier
    ? existingScheduledTier
    : (existingSubscription?.billing_tier as BillingTier | null) ?? incomingTier;
  const currentPriceId = shouldPromoteScheduledTier
    ? existingScheduledPriceId
    : existingSubscription?.stripe_price_id_current ?? input.stripePriceIdCurrent;
  const resolvedBillingAccountId =
    billingAccountId ?? existingSubscription?.billing_account_id ?? null;

  if (!resolvedBillingAccountId) {
    throw new Error(
      `Impossible de rattacher l'abonnement Stripe ${input.stripeSubscriptionId} à un compte de facturation famille.`,
    );
  }

  const updateData: Prisma.family_subscriptionsUncheckedUpdateInput = {
    billing_account_id: resolvedBillingAccountId,
    provider: "stripe",
    stripe_subscription_id: input.stripeSubscriptionId,
    stripe_price_id_current: currentPriceId,
    stripe_price_id_scheduled: shouldPromoteScheduledTier
      ? null
      : existingSubscription?.stripe_price_id_scheduled ?? null,
    status: input.status,
    plan_key: hasPremiumAccess(input.status) ? "premium" : "free",
    billing_tier: currentTier,
    scheduled_billing_tier: shouldPromoteScheduledTier
      ? null
      : existingSubscription?.scheduled_billing_tier ?? null,
    trial_end_at: input.trialEndAt,
    current_period_end_at: input.currentPeriodEndAt,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    updated_at: new Date(),
  };

  const createData: Prisma.family_subscriptionsUncheckedCreateInput = {
    family_id: input.familyId,
    billing_account_id: resolvedBillingAccountId,
    provider: "stripe",
    stripe_subscription_id: input.stripeSubscriptionId,
    stripe_price_id_current: input.stripePriceIdCurrent,
    stripe_price_id_scheduled: null,
    status: input.status,
    plan_key: hasPremiumAccess(input.status) ? "premium" : "free",
    billing_tier: incomingTier,
    scheduled_billing_tier: null,
    trial_end_at: input.trialEndAt,
    current_period_end_at: input.currentPeriodEndAt,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return prisma.family_subscriptions.upsert({
    where: { family_id: input.familyId },
    create: createData,
    update: updateData,
  });
}

export async function syncStripeSubscriptionById(input: {
  stripeSubscriptionId: string;
  familyIdHint?: string | null;
  stripeCustomerIdHint?: string | null;
}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);
  const subscriptionLike = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const familyId =
    (subscription.metadata.familyId as string | undefined) ??
    (await resolveFamilyIdFromStripeContext({
      familyIdHint: input.familyIdHint ?? null,
      stripeCustomerId: input.stripeCustomerIdHint ?? customerId,
      stripeSubscriptionId: subscription.id,
    }));

  if (!familyId) {
    throw new Error(
      `Impossible de rattacher l'abonnement Stripe ${subscription.id} à une famille.`,
    );
  }

  const customer =
    typeof subscription.customer === "string"
      ? await stripe.customers.retrieve(subscription.customer)
      : subscription.customer;
  const billingEmail =
    "deleted" in customer ? null : customer.email ?? null;

  return applyStripeSubscriptionSnapshot({
    familyId,
    stripeCustomerId: customerId,
    billingEmail,
    stripeSubscriptionId: subscription.id,
    stripePriceIdCurrent: subscription.items.data[0]?.price.id ?? null,
    status: subscription.status,
    trialEndAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    currentPeriodEndAt: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000)
      : subscriptionLike.current_period_end
        ? new Date(subscriptionLike.current_period_end * 1000)
        : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}
