"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveFamily, requireActiveFamilyAdmin } from "@/lib/auth-utils";
import { isStripeConfigured } from "@/lib/stripe";
import {
  createFamilyBillingPortalSession,
  createFamilyCheckoutSession,
} from "@/lib/stripe";

type BillingActionResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function startPremiumCheckout(): Promise<BillingActionResult> {
  const { familyId, profileId } = await requireActiveFamilyAdmin();

  if (!isStripeConfigured()) {
    return {
      success: false,
      error: "Stripe n'est pas encore configuré sur le serveur.",
    };
  }

  const [family, profile, memberCount] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    }),
    prisma.profiles.findUnique({
      where: { id: profileId },
      select: { email: true },
    }),
    prisma.family_members.count({
      where: { family_id: familyId },
    }),
  ]);

  if (!family) {
    return { success: false, error: "Famille introuvable." };
  }

  try {
    const url = await createFamilyCheckoutSession({
      familyId,
      familyName: family.name,
      memberCount,
      billingEmail: profile?.email ?? null,
    });

    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de préparer le checkout Stripe.",
    };
  }
}

export async function openBillingPortal(): Promise<BillingActionResult> {
  const { familyId } = await requireActiveFamilyAdmin();

  if (!isStripeConfigured()) {
    return {
      success: false,
      error: "Stripe n'est pas encore configuré sur le serveur.",
    };
  }

  try {
    const url = await createFamilyBillingPortalSession(familyId);
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir le portail de facturation.",
    };
  }
}

export async function getActiveFamilyBillingSummary() {
  const { familyId } = await requireActiveFamily();

  return prisma.family_subscriptions.findUnique({
    where: { family_id: familyId },
    include: {
      family_billing_accounts: true,
    },
  });
}
