import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getPreferredLocationId } from "@/lib/location-preferences";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteShoppingItemButton } from "@/components/forms/delete-shopping-item-button";
import { ShoppingAddItemDialog } from "@/components/forms/shopping-add-item-dialog";
import { ShoppingLocationSwitcher } from "@/components/forms/shopping-location-switcher";
import { ShoppingItemToggle } from "@/components/forms/shopping-item-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

type ShoppingPageProps = {
  searchParams: Promise<{ locationId?: string | string[] }>;
};

function formatShoppingQuantity(item: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}) {
  if (item.raw_quantity_text) return item.raw_quantity_text;
  if (!item.quantity_numeric) return null;
  return `${item.quantity_numeric.toString()}${item.unit ? ` ${item.unit}` : ""}`;
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const { familyId, profileId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const rawLocationId = Array.isArray(resolvedSearchParams.locationId)
    ? resolvedSearchParams.locationId[0]
    : resolvedSearchParams.locationId;

  const [locations, familyContextPreferences] = await Promise.all([
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: { created_at: "asc" },
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

  if (locations.length === 0) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <AppPageHeader
          eyebrow="Courses"
          title="Liste de courses"
          description="Centralise les articles à acheter pour chaque lieu de la famille."
        />
        <EmptyState
          title="Aucun lieu disponible"
          description="Ajoutez d'abord un lieu à la famille pour créer une liste de courses."
          action={
            <Link href="/profile/locations" className={buttonVariants()}>
              Gérer les lieux
            </Link>
          }
        />
      </div>
    );
  }

  const preferredLocationId = getPreferredLocationId(
    locations,
    familyContextPreferences?.last_selected_location_id,
  );

  const selectedLocation =
    locations.find((location) => location.id === rawLocationId) ??
    locations.find((location) => location.id === preferredLocationId) ??
    locations[0];

  const items = await prisma.shopping_items.findMany({
    where: { family_id: familyId, location_id: selectedLocation.id },
    include: {
      family_members_shopping_items_family_id_created_by_profile_idTofamily_members: {
        include: {
          profiles_family_members_profile_idToprofiles: { select: { display_name: true } },
        },
      },
      family_members_shopping_items_family_id_completed_by_profile_idTofamily_members: {
        include: {
          profiles_family_members_profile_idToprofiles: { select: { display_name: true } },
        },
      },
      recipes: { select: { title: true } },
      meal_plans: { select: { title: true } },
    },
    orderBy: [{ is_completed: "asc" }, { created_at: "desc" }],
  });

  const pendingItems = items.filter((item) => !item.is_completed);
  const completedItems = items.filter((item) => item.is_completed);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Courses"
        title={selectedLocation.name}
        description="Garde sous les yeux la liste du lieu actif, puis ajoute un article seulement quand tu en as besoin."
        badges={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <ShoppingCart className="size-3.5" />
              {pendingItems.length} à acheter
            </span>
            {completedItems.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-xs text-white">
                {completedItems.length} acheté{completedItems.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </>
        }
      >
        {locations.length > 1 ? (
          <ShoppingLocationSwitcher
            locations={locations.map((location) => ({
              id: location.id,
              name: location.name,
            }))}
            selectedLocationId={selectedLocation.id}
          />
        ) : null}
      </AppPageHeader>

      {/* Liste */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              À acheter
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pendingItems.length})
              </span>
            </CardTitle>
            <ShoppingAddItemDialog
              locationId={selectedLocation.id}
              locationName={selectedLocation.name}
              triggerClassName="hidden md:inline-flex"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {pendingItems.length === 0 ? (
            <EmptyState
              title="Rien à acheter"
              description="Ajoutez un article ou envoyez les ingrédients d'une recette."
            />
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => {
                const quantity = formatShoppingQuantity(item);
                const createdBy =
                  item.family_members_shopping_items_family_id_created_by_profile_idTofamily_members
                    .profiles_family_members_profile_idToprofiles.display_name;
                const extraInfo = [
                  item.comment ? `Note : ${item.comment}` : null,
                  item.recipes ? `Depuis la recette : ${item.recipes.title}` : null,
                  item.meal_plans ? `Repas lié : ${item.meal_plans.title}` : null,
                  createdBy ? `Ajouté par : ${createdBy}` : null,
                ].filter(Boolean) as string[];

                return (
                  <div
                    key={item.id}
                    className="flex gap-2.5 rounded-xl border border-border p-2.5 sm:p-3"
                  >
                    <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-5">{item.name}</p>
                          {quantity ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{quantity}</p>
                          ) : null}
                          {extraInfo.length > 0 ? (
                            <details className="mt-1.5">
                              <summary className="cursor-pointer text-xs font-medium text-primary/80 hover:text-primary">
                                Plus d&apos;infos
                              </summary>
                              <div className="mt-1 space-y-1 rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                {extraInfo.map((line) => (
                                  <p key={line}>{line}</p>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                        <DeleteShoppingItemButton itemId={item.id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Déjà acheté */}
      {completedItems.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <details>
              <summary className="cursor-pointer">
                <CardTitle className="inline text-base text-muted-foreground">
                  Déjà acheté
                  <span className="ml-2 text-sm font-normal">({completedItems.length})</span>
                </CardTitle>
              </summary>
              <div className="mt-3 space-y-2">
                {completedItems.map((item) => {
                  const quantity = formatShoppingQuantity(item);
                  const completedBy =
                    item.family_members_shopping_items_family_id_completed_by_profile_idTofamily_members
                      ?.profiles_family_members_profile_idToprofiles.display_name;
                  const extraInfo = [
                    completedBy ? `Validé par : ${completedBy}` : null,
                    item.completed_at
                      ? `Le ${new Date(item.completed_at).toLocaleDateString("fr-CH")}`
                      : null,
                  ].filter(Boolean) as string[];

                  return (
                    <div
                      key={item.id}
                      className="flex gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 sm:p-3"
                    >
                      <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5 line-through decoration-muted-foreground/60">
                              {item.name}
                            </p>
                            {quantity ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">{quantity}</p>
                            ) : null}
                            {extraInfo.length > 0 ? (
                              <details className="mt-1.5">
                                <summary className="cursor-pointer text-xs font-medium text-primary/80 hover:text-primary">
                                  Plus d&apos;infos
                                </summary>
                                <div className="mt-1 space-y-1 rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                                  {extraInfo.map((line) => (
                                    <p key={line}>{line}</p>
                                  ))}
                                </div>
                              </details>
                            ) : null}
                          </div>
                          <DeleteShoppingItemButton itemId={item.id} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </CardHeader>
        </Card>
      ) : null}

      <ShoppingAddItemDialog
        locationId={selectedLocation.id}
        locationName={selectedLocation.name}
        triggerClassName="hidden"
        floatingOnMobile
      />
    </div>
  );
}
