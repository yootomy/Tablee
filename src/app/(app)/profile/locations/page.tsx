import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getPreferredLocationId } from "@/lib/location-preferences";
import { CreateLocationForm } from "@/components/forms/create-location-form";
import { EditLocationForm } from "@/components/forms/edit-location-form";
import { SetDefaultLocationButton } from "@/components/forms/set-default-location-button";
import { DeleteLocationButton } from "@/components/forms/delete-location-button";
import { ProfileSectionNav } from "@/components/layout/profile-section-nav";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus } from "lucide-react";

export default async function FamilyLocationsPage() {
  const { familyId, profileId } = await requireActiveFamily();

  const [family, locations, familyContextPreferences] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    }),
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: [{ created_at: "asc" }],
    }),
    prisma.family_context_preferences.findUnique({
      where: {
        profile_id_family_id: {
          profile_id: profileId,
          family_id: familyId,
        },
      },
      select: {
        last_selected_location_id: true,
      },
    }),
  ]);

  const preferredLocationId = getPreferredLocationId(
    locations,
    familyContextPreferences?.last_selected_location_id,
  );
  const preferredLocationName =
    locations.find((location) => location.id === preferredLocationId)?.name ?? null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Ma famille"
        title={family?.name ?? "Famille"}
        description="Centralise les lieux utilisés par les repas et les courses pour garder une organisation simple."
        badges={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <MapPin className="size-3.5" />
              {locations.length} lieu{locations.length > 1 ? "x" : ""} actif{locations.length > 1 ? "s" : ""}
            </span>
            {preferredLocationName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
                <MapPin className="size-3.5" />
                Par défaut : {preferredLocationName}
              </span>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProfileSectionNav inverse />
          <Link
            href="/onboarding"
            className={buttonVariants({
              size: "sm",
              variant: "outline",
              className: "border-white/15 bg-white/10 text-white hover:bg-white/20",
            })}
          >
            Créer ou rejoindre
          </Link>
        </div>
      </AppPageHeader>

      {/* Contenu */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Sidebar ajout — première dans le DOM pour mobile, droite sur lg+ */}
        <Card className="lg:order-last">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" />
              Ajouter un lieu
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-sm text-muted-foreground">
              Ajoute seulement le nom utile pour les repas et les courses.
            </p>
            <CreateLocationForm />
          </CardContent>
        </Card>

        {/* Lieux existants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Lieux actifs
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({locations.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {locations.length === 0 ? (
              <EmptyState
                title="Aucun lieu"
                description="Ajoutez le premier lieu de cette famille pour continuer."
              />
            ) : (
              <div className="space-y-3">
                {locations.map((location) => {
                  const isDefault = preferredLocationId === location.id;

                  return (
                    <div
                      key={location.id}
                      className="rounded-2xl border border-border/80 bg-background/80 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{location.name}</p>
                            {isDefault ? (
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                                Courses par défaut
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ajouté le {new Date(location.created_at).toLocaleDateString("fr-CH")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <SetDefaultLocationButton
                            locationId={location.id}
                            isDefault={isDefault}
                          />
                          <EditLocationForm
                            locationId={location.id}
                            initialName={location.name}
                          />
                          {!isDefault && locations.length > 1 ? (
                            <DeleteLocationButton
                              locationId={location.id}
                              locationName={location.name}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
