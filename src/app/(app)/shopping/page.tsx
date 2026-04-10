import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { PageHero } from "@/components/layout/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteShoppingItemButton } from "@/components/forms/delete-shopping-item-button";
import { ShoppingAddItemDialog } from "@/components/forms/shopping-add-item-dialog";
import { ShoppingItemToggle } from "@/components/forms/shopping-item-toggle";
import { buttonVariants } from "@/components/ui/button";

type ShoppingPageProps = {
  searchParams: Promise<{ locationId?: string | string[] }>;
};

function formatShoppingQuantity(item: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}) {
  if (item.raw_quantity_text) {
    return item.raw_quantity_text;
  }

  if (!item.quantity_numeric) {
    return null;
  }

  return `${item.quantity_numeric.toString()}${item.unit ? ` ${item.unit}` : ""}`;
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const { familyId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const rawLocationId = Array.isArray(resolvedSearchParams.locationId)
    ? resolvedSearchParams.locationId[0]
    : resolvedSearchParams.locationId;

  const locations = await prisma.locations.findMany({
    where: {
      family_id: familyId,
      archived_at: null,
    },
    orderBy: { name: "asc" },
  });

  if (locations.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <PageHero
          eyebrow="Courses"
          title="Liste de courses"
          description="Travaille lieu par lieu pour éviter les listes mélangées et garder un contexte clair."
        />
        <EmptyState
          title="Aucun lieu disponible"
          description="Ajoute d'abord un lieu à la famille active pour créer une liste de courses contextualisée."
          action={
            <Link href="/family/locations" className={buttonVariants()}>
              Gérer les lieux
            </Link>
          }
        />
      </div>
    );
  }

  const selectedLocation =
    locations.find((location) => location.id === rawLocationId) ?? locations[0];

  const items = await prisma.shopping_items.findMany({
    where: {
      family_id: familyId,
      location_id: selectedLocation.id,
    },
    include: {
      family_members_shopping_items_family_id_created_by_profile_idTofamily_members: {
        include: {
          profiles_family_members_profile_idToprofiles: {
            select: {
              display_name: true,
            },
          },
        },
      },
      family_members_shopping_items_family_id_completed_by_profile_idTofamily_members: {
        include: {
          profiles_family_members_profile_idToprofiles: {
            select: {
              display_name: true,
            },
          },
        },
      },
      recipes: {
        select: {
          title: true,
        },
      },
      meal_plans: {
        select: {
          title: true,
        },
      },
    },
    orderBy: [{ is_completed: "asc" }, { created_at: "desc" }],
  });

  const pendingItems = items.filter((item) => !item.is_completed);
  const completedItems = items.filter((item) => item.is_completed);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHero
        eyebrow="Courses"
        title={selectedLocation.name}
        description="Travaille lieu par lieu pour garder une liste claire, rapide à cocher et facile à relire."
        meta={`${pendingItems.length} à acheter • ${completedItems.length} déjà validé${completedItems.length !== 1 ? "s" : ""}`}
        action={
          <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              name="locationId"
              defaultValue={selectedLocation.id}
              className="h-11 w-full min-w-0 rounded-full border border-white/25 bg-white/95 px-4 py-2 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:min-w-44 sm:w-auto md:h-10 md:text-sm"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Rafraîchir cette liste
            </button>
          </form>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          {/* À acheter */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              À acheter
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({pendingItems.length})
              </span>
            </p>
            <ShoppingAddItemDialog
              locationId={selectedLocation.id}
              locationName={selectedLocation.name}
              triggerClassName="hidden md:inline-flex"
            />
          </div>

          {pendingItems.length === 0 ? (
            <EmptyState
              title="Rien à acheter"
              description="Ajoute un article manuellement ou envoie les ingrédients d'une recette."
            />
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => {
                const quantity = formatShoppingQuantity(item);
                const hasExtraInfo = Boolean(
                  item.family_members_shopping_items_family_id_created_by_profile_idTofamily_members
                    .profiles_family_members_profile_idToprofiles.display_name ||
                    item.recipes ||
                    item.meal_plans,
                );

                return (
                  <div
                    key={item.id}
                    className="flex gap-2.5 rounded-xl border border-border/80 bg-background p-3"
                  >
                    <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold leading-5">{item.name}</p>
                          {item.comment ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{item.comment}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {quantity ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {quantity}
                            </span>
                          ) : null}
                          <DeleteShoppingItemButton itemId={item.id} />
                        </div>
                      </div>

                      {hasExtraInfo ? (
                        <details className="rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                          <summary className="cursor-pointer font-medium text-foreground/80">
                            Plus d&apos;infos
                          </summary>
                          <div className="mt-1.5 space-y-1 leading-5">
                            <p>
                              Ajouté par{" "}
                              {
                                item.family_members_shopping_items_family_id_created_by_profile_idTofamily_members
                                  .profiles_family_members_profile_idToprofiles.display_name
                              }
                            </p>
                            {item.recipes ? (
                              <p>Depuis la recette : {item.recipes.title}</p>
                            ) : null}
                            {item.meal_plans ? (
                              <p>Repas lié : {item.meal_plans.title}</p>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Déjà acheté — section repliable */}
          {completedItems.length > 0 && (
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-bold text-muted-foreground hover:text-foreground">
                Déjà acheté
                <span className="ml-1.5 text-xs font-normal">
                  ({completedItems.length})
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {completedItems.map((item) => {
                  const quantity = formatShoppingQuantity(item);
                  const hasExtraInfo = Boolean(
                    item.family_members_shopping_items_family_id_created_by_profile_idTofamily_members
                      .profiles_family_members_profile_idToprofiles.display_name ||
                      item.family_members_shopping_items_family_id_completed_by_profile_idTofamily_members ||
                      item.completed_at,
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex gap-2.5 rounded-xl border border-border bg-muted/15 p-3"
                    >
                      <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold leading-5 line-through decoration-muted-foreground/60">
                              {item.name}
                            </p>
                            {item.comment ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{item.comment}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {quantity ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                {quantity}
                              </span>
                            ) : null}
                            <DeleteShoppingItemButton itemId={item.id} />
                          </div>
                        </div>

                        {hasExtraInfo ? (
                          <details className="rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            <summary className="cursor-pointer font-medium text-foreground/80">
                              Plus d&apos;infos
                            </summary>
                            <div className="mt-1.5 space-y-1 leading-5">
                              <p>
                                Ajouté par{" "}
                                {
                                  item.family_members_shopping_items_family_id_created_by_profile_idTofamily_members
                                    .profiles_family_members_profile_idToprofiles.display_name
                                }
                              </p>
                              {item.family_members_shopping_items_family_id_completed_by_profile_idTofamily_members ? (
                                <p>
                                  Validé par{" "}
                                  {
                                    item.family_members_shopping_items_family_id_completed_by_profile_idTofamily_members
                                      .profiles_family_members_profile_idToprofiles.display_name
                                  }
                                </p>
                              ) : null}
                              {item.completed_at ? (
                                <p>
                                  Le{" "}
                                  {new Date(item.completed_at).toLocaleDateString("fr-CH", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </p>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>

      <ShoppingAddItemDialog
        locationId={selectedLocation.id}
        locationName={selectedLocation.name}
        triggerClassName="hidden"
        floatingOnMobile
      />
    </div>
  );
}
