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
    <div className="space-y-4 p-4 sm:p-6">
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
      >
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Link href="/recipes/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Recette
          </Link>
          <Link href="/calendar/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Repas
          </Link>
          <Link href="/shopping" className={buttonVariants({ variant: "outline", size: "sm", className: "border-white/20 bg-white/95 text-foreground hover:bg-white" })}>
            <ShoppingCart className="size-3.5" />
            Courses
          </Link>
          <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm", className: "border-white/20 bg-white/95 text-foreground hover:bg-white" })}>
            <Users className="size-3.5" />
            Famille
          </Link>
        </div>
      </AppPageHeader>

      {/* Contenu principal */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
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
              <ul className="divide-y">
                {upcomingMeals.map((meal) => {
                  const responsible =
                    meal.family_members_meal_plans_family_id_responsible_profile_idTofamily_members
                      ?.profiles_family_members_profile_idToprofiles.display_name;
                  return (
                    <li key={meal.id}>
                      <Link
                        href={`/calendar/${meal.id}`}
                        className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          meal.meal_slot === "lunch" ? "bg-primary/10" : "bg-primary/5"
                        }`}>
                          {meal.meal_slot === "lunch" ? (
                            <UtensilsCrossed className="size-4 text-primary" />
                          ) : (
                            <Clock className="size-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium group-hover:text-primary">{meal.title}</p>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                            {new Date(meal.meal_date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                            <span className="text-muted-foreground/40">·</span>
                            {meal.meal_slot === "lunch" ? "Midi" : "Soir"}
                            {meal.locations ? (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <MapPin className="size-3" />
                                  {meal.locations.name}
                                </span>
                              </>
                            ) : null}
                            {responsible ? (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                {responsible}
                              </>
                            ) : null}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Colonne droite */}
        <div className="space-y-4">
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
                <ul className="divide-y">
                  {recentRecipes.map((recipe) => (
                    <li key={recipe.id}>
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="group flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <p className="min-w-0 truncate text-sm font-medium group-hover:text-primary">
                          {recipe.title}
                        </p>
                        {recipe.servings ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {recipe.servings} p.
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
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
                <ul className="divide-y">
                  {pendingShoppingItems.map((item) => {
                    const qty = formatShoppingQuantity(item);
                    return (
                      <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{item.name}</span>
                          {item.locations ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({item.locations.name})
                            </span>
                          ) : null}
                        </div>
                        {qty ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{qty}</span>
                        ) : null}
                      </li>
                    );
                  })}
                  {totalShoppingItems > pendingShoppingItems.length ? (
                    <li className="pt-2 text-center">
                      <Link href="/shopping" className="text-xs text-primary hover:underline">
                        +{totalShoppingItems - pendingShoppingItems.length} autres articles
                      </Link>
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
