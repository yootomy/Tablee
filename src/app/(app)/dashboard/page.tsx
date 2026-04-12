import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CalendarDays,
  ChefHat,
  ShoppingCart,
  Users,
  Plus,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  MapPin,
} from "lucide-react";

function formatShoppingQuantity(item: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}) {
  if (item.raw_quantity_text) return item.raw_quantity_text;
  if (!item.quantity_numeric) return null;
  return `${item.quantity_numeric.toString()}${item.unit ? ` ${item.unit}` : ""}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const prefs = await prisma.profile_preferences.findUnique({
    where: { profile_id: session.user.id },
  });

  if (!prefs?.active_family_id) redirect("/onboarding");

  const familyId = prefs.active_family_id;

  const [family, upcomingMeals, recipeCount, recentRecipes, pendingShoppingItems, totalShoppingItems, memberCount] =
    await Promise.all([
      prisma.families.findUnique({ where: { id: familyId } }),
      prisma.meal_plans.findMany({
        where: { family_id: familyId, meal_date: { gte: new Date() }, status: "planned" },
        include: {
          locations: { select: { name: true } },
          family_members_meal_plans_family_id_responsible_profile_idTofamily_members: {
            include: {
              profiles_family_members_profile_idToprofiles: { select: { display_name: true } },
            },
          },
        },
        orderBy: [{ meal_date: "asc" }, { meal_slot: "asc" }],
        take: 5,
      }),
      prisma.recipes.count({ where: { family_id: familyId, archived_at: null } }),
      prisma.recipes.findMany({
        where: { family_id: familyId, archived_at: null },
        orderBy: { created_at: "desc" },
        take: 4,
        select: { id: true, title: true, servings: true },
      }),
      prisma.shopping_items.findMany({
        where: { family_id: familyId, is_completed: false },
        include: { locations: { select: { name: true } } },
        orderBy: [{ created_at: "desc" }],
        take: 8,
      }),
      prisma.shopping_items.count({ where: { family_id: familyId, is_completed: false } }),
      prisma.family_members.count({ where: { family_id: familyId } }),
    ]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const firstName = session.user.name?.split(" ")[0] ?? "chef";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow={`${greeting} !`}
        title={firstName}
        description={family?.name ?? "Tableau de bord familial"}
        badges={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <CalendarDays className="size-3.5" />
              {upcomingMeals.length} repas prévu{upcomingMeals.length > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <ChefHat className="size-3.5" />
              {recipeCount} recette{recipeCount > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <ShoppingCart className="size-3.5" />
              {totalShoppingItems} course{totalShoppingItems > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <Users className="size-3.5" />
              {memberCount} membre{memberCount > 1 ? "s" : ""}
            </span>
          </>
        }
      />

      {/* Contenu principal */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Prochains repas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Prochains repas</CardTitle>
              <Link href="/calendar" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Tout voir <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingMeals.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="size-10 text-muted-foreground/40" />}
                title="Aucun repas prévu"
                description="Planifiez vos repas depuis le calendrier."
                action={
                  <Link href="/calendar/new" className={buttonVariants({ size: "sm" })}>
                    <Plus className="size-3.5" />
                    Planifier
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {upcomingMeals.map((meal) => {
                  const responsible =
                    meal.family_members_meal_plans_family_id_responsible_profile_idTofamily_members
                      ?.profiles_family_members_profile_idToprofiles.display_name;
                  return (
                    <Link
                      key={meal.id}
                      href={`/calendar/${meal.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:p-4"
                    >
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        meal.meal_slot === "lunch" ? "bg-primary/10" : "bg-primary/5"
                      }`}>
                        {meal.meal_slot === "lunch" ? (
                          <UtensilsCrossed className="size-5 text-primary" />
                        ) : (
                          <Clock className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium leading-snug group-hover:text-primary sm:text-sm">{meal.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            {new Date(meal.meal_date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            {meal.meal_slot === "lunch" ? "Midi" : "Soir"}
                          </span>
                          {meal.locations ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                              <MapPin className="size-3" />
                              {meal.locations.name}
                            </span>
                          ) : null}
                          {responsible ? (
                            <span className="text-xs text-muted-foreground">
                              {responsible}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Recettes récentes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Dernières recettes
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({recipeCount})</span>
                </CardTitle>
                <Link href="/recipes" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Tout voir <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentRecipes.length === 0 ? (
                <EmptyState
                  icon={<ChefHat className="size-10 text-muted-foreground/40" />}
                  title="Aucune recette"
                  description="Créez votre première recette."
                  action={
                    <Link href="/recipes/new" className={buttonVariants({ size: "sm" })}>
                      <Plus className="size-3.5" />
                      Ajouter
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {recentRecipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:p-4"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <ChefHat className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium leading-snug group-hover:text-primary sm:text-sm">
                          {recipe.title}
                        </p>
                        {recipe.servings ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            <Users className="size-3" />
                            {recipe.servings} p.
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courses en attente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Courses
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({totalShoppingItems})</span>
                </CardTitle>
                <Link href="/shopping" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Ouvrir <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {pendingShoppingItems.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="size-10 text-muted-foreground/40" />}
                  title="Liste vide"
                  description="Ajoutez des articles ou envoyez les ingrédients d'une recette."
                />
              ) : (
                <div className="space-y-3">
                  {pendingShoppingItems.map((item) => {
                    const qty = formatShoppingQuantity(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-xl border border-border p-3.5 sm:p-4"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <ShoppingCart className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium leading-snug sm:text-sm">{item.name}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {qty ? (
                              <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                                {qty}
                              </span>
                            ) : null}
                            {item.locations ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                                <MapPin className="size-3" />
                                {item.locations.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {totalShoppingItems > pendingShoppingItems.length ? (
                    <Link
                      href="/shopping"
                      className="block rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3 text-center text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      +{totalShoppingItems - pendingShoppingItems.length} autres articles
                    </Link>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
