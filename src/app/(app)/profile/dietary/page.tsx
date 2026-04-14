import { requireActiveFamily } from "@/lib/auth-utils";
import { resolveFamilyEntitlements } from "@/lib/family-billing";
import { prisma } from "@/lib/prisma";
import { DIETARY_REGIMES, DIETARY_ALLERGENS } from "@/lib/dietary";
import { ProfileSectionNav } from "@/components/layout/profile-section-nav";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BillingActionButton } from "@/components/profile/billing-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isStripeConfigured } from "@/lib/stripe";
import { saveDietaryPreferences } from "./actions";

export default async function DietaryPage() {
  const { familyId, profileId, role } = await requireActiveFamily();

  const [family, entitlements, member] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { name: true },
    }),
    resolveFamilyEntitlements(familyId),
    prisma.family_members.findUnique({
      where: { family_id_profile_id: { family_id: familyId, profile_id: profileId } },
      select: {
        id: true,
        member_dietary_preferences: {
          select: { type: true, value: true },
        },
      },
    }),
  ]);

  const savedRegimes = new Set(
    member?.member_dietary_preferences
      .filter((p) => p.type === "regime")
      .map((p) => p.value) ?? [],
  );
  const savedAllergens = new Set(
    member?.member_dietary_preferences
      .filter((p) => p.type === "allergen")
      .map((p) => p.value) ?? [],
  );

  const stripeReady = isStripeConfigured();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Mon profil"
        title={family?.name ?? "Famille"}
        description="Mes contraintes alimentaires — régimes et allergènes."
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProfileSectionNav inverse />
        </div>
      </AppPageHeader>

      {!entitlements.isPremiumActive ? (
        <EmptyState
          title="Préférences alimentaires — Premium"
          description="Passe au Premium pour renseigner tes contraintes alimentaires et recevoir des alertes sur les recettes."
          action={
            role === "admin" && stripeReady ? (
              <BillingActionButton
                actionType="checkout"
                label="Passer au Premium"
                className="shadow-sm"
              />
            ) : null
          }
        />
      ) : (
        <form action={saveDietaryPreferences}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mes préférences alimentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Régimes</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {DIETARY_REGIMES.map((regime) => (
                    <label key={regime.value} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        name={`regime_${regime.value}`}
                        defaultChecked={savedRegimes.has(regime.value)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{regime.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Allergènes</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {DIETARY_ALLERGENS.map((allergen) => (
                    <label key={allergen.value} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        name={`allergen_${allergen.value}`}
                        defaultChecked={savedAllergens.has(allergen.value)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{allergen.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
