import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteShoppingItemButton } from "@/components/forms/delete-shopping-item-button";
import { ShoppingAddItemDialog } from "@/components/forms/shopping-add-item-dialog";
import { ShoppingItemToggle } from "@/components/forms/shopping-item-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, MapPin } from "lucide-react";

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
  const { familyId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const rawLocationId = Array.isArray(resolvedSearchParams.locationId)
    ? resolvedSearchParams.locationId[0]
    : resolvedSearchParams.locationId;

  const locations = await prisma.locations.findMany({
    where: { family_id: familyId, archived_at: null },
    orderBy: { name: "asc" },
  });

  if (locations.length === 0) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-accent/80 to-primary/5 p-4 sm:p-5">
          <p className="text-xs font-medium text-primary">Courses</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Liste de courses</h1>
        </div>
        <EmptyState
          title="Aucun lieu disponible"
          description="Ajoutez d'abord un lieu à la famille pour créer une liste de courses."
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
      {/* Header compact */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-accent/80 to-primary/5 p-4 sm:p-5">
        <p className="text-xs font-medium text-primary">Courses</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{selectedLocation.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
            <ShoppingCart className="size-3.5" />
            {pendingItems.length} à acheter
          </span>
          {completedItems.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {completedItems.length} acheté{completedItems.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        {locations.length > 1 ? (
          <form className="mt-3 flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <select
              name="locationId"
              defaultValue={selectedLocation.id}
              className="h-9 min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Changer
            </button>
          </form>
        ) : null}
      </div>

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

                return (
                  <div
                    key={item.id}
                    className="flex gap-2.5 rounded-lg border p-3"
                  >
                    <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-5">{item.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[
                              quantity,
                              item.comment,
                              item.recipes ? `via ${item.recipes.title}` : null,
                              createdBy ? `par ${createdBy}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
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

                  return (
                    <div
                      key={item.id}
                      className="flex gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <ShoppingItemToggle itemId={item.id} checked={item.is_completed} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5 line-through decoration-muted-foreground/60">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[
                                quantity,
                                completedBy ? `validé par ${completedBy}` : null,
                                item.completed_at
                                  ? `le ${new Date(item.completed_at).toLocaleDateString("fr-CH")}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
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
