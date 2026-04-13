import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import {
  deriveScheduledTierChange,
  getBillingTierForMemberCount,
  getPriceForBillingTier,
  hasPremiumAccess,
} from "@/lib/family-billing";

describe("family-billing", () => {
  it("résout le bon palier selon la taille de la famille", () => {
    expect(getBillingTierForMemberCount(1)).toBe("small");
    expect(getBillingTierForMemberCount(4)).toBe("small");
    expect(getBillingTierForMemberCount(5)).toBe("large");
  });

  it("résout le bon prix pour chaque palier", () => {
    expect(getPriceForBillingTier("small")).toBe(6.99);
    expect(getPriceForBillingTier("large")).toBe(8.99);
  });

  it("considère trialing et active comme premium actif", () => {
    expect(hasPremiumAccess("trialing")).toBe(true);
    expect(hasPremiumAccess("active")).toBe(true);
    expect(hasPremiumAccess("past_due")).toBe(false);
    expect(hasPremiumAccess("canceled")).toBe(false);
  });

  it("programme un passage au palier large au prochain cycle", () => {
    expect(
      deriveScheduledTierChange(5, {
        status: "active",
        billing_tier: "small",
        scheduled_billing_tier: null,
        trial_end_at: null,
        current_period_end_at: null,
        cancel_at_period_end: false,
      }),
    ).toEqual({
      nextTier: "large",
      nextPriceEur: 8.99,
    });
  });

  it("n'annonce pas de changement si le plan n'est pas premium actif", () => {
    expect(
      deriveScheduledTierChange(6, {
        status: "past_due",
        billing_tier: "small",
        scheduled_billing_tier: null,
        trial_end_at: null,
        current_period_end_at: null,
        cancel_at_period_end: false,
      }),
    ).toBeNull();
  });
});
