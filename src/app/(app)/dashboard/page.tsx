import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  if (item.raw_quantity_text) {
    return item.raw_quantity_text;
  }

  if (!item.quantity_numeric) {
    return null;
  }

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
      prisma.families.findUnique({
        where: { id: familyId },
      }),
      prisma.meal_plans.findMany({
        where: {
          family_id: familyId,
          meal_date: { gte: new Date() },
          status: "planned",
        },
        include: {
          locations: { select: { name: true } },
          family_members_meal_plans_family_id_responsible_profile_idTofamily_members: {
            include: {
              profiles_family_members_profile_idToprofiles: {
                select: { display_name: true },
              },
            },
          },
        },
        orderBy: [{ meal_date: "asc" }, { meal_slot: "asc" }],
        take: 6,
      }),
      prisma.recipes.count({
        where: { family_id: familyId, archived_at: null },
      }),
      prisma.recipes.findMany({
        where: { family_id: familyId, archived_at: null },
        orderBy: { created_at: "desc" },
        take: 3,
        select: { id: true, title: true, servings: true },
      }),
      prisma.shopping_items.findMany({
        where: { family_id: familyId, is_completed: false },
        include: {
          locations: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ created_at: "desc" }],
        take: 12,
      }),
      prisma.shopping_items.count({
        where: { family_id: familyId, is_completed: false },
      }),
      prisma.family_members.count({
        where: { family_id: familyId },
      }),
    ]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const firstName = session.user.name?.split(" ")[0] ?? "chef";

  return (
    <div className="space-y-4 overflow-x-clip p-3 [text-size-adjust:100%] [-webkit-text-size-adjust:100%] sm:space-y-6 sm:p-6">
      {/* Welcome header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-white shadow-lg sm:p-8">
        <p className="text-xs font-medium text-white/80 sm:text-sm">{greeting} !</p>
        <h2 className="mt-1 break-words text-xl font-extrabold sm:text-3xl">{firstName}</h2>
        <p className="mt-1.5 break-words text-xs text-white/70 sm:mt-2 sm:text-sm">
          {family?.name} · {memberCount} membre{memberCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <Card className="border border-primary/10 bg-primary/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
              <CalendarDays className="size-5 text-primary sm:size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-none sm:text-2xl">{upcomingMeals.length}</p>
              <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground">
                Repas prévus
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-primary/10 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
              <ChefHat className="size-5 text-primary sm:size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-none sm:text-2xl">{recipeCount}</p>
              <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground">
                Recettes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-accent/70 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
              <ShoppingCart className="size-5 text-primary sm:size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-none sm:text-2xl">{totalShoppingItems}</p>
              <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground">
                Courses
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-primary/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
              <Users className="size-5 text-primary sm:size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-none sm:text-2xl">{memberCount}</p>
              <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground">
                Membres
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <Link
          href="/recipes/new"
          className={buttonVariants({ size: "xs" })}
        >
          <Plus className="size-4" />
          Recette
        </Link>
        <Link
          href="/calendar/new"
          className={buttonVariants({ size: "xs" })}
        >
          <Plus className="size-4" />
          Repas
        </Link>
        <Link
          href="/shopping"
          className={buttonVariants({ variant: "outline", size: "xs" })}
        >
          <ShoppingCart className="size-4" />
          Courses
        </Link>
        <Link
          href="/family/members"
          className={buttonVariants({ variant: "outline", size: "xs" })}
        >
          <Users className="size-4" />
          Inviter
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming meals */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary sm:size-5" />
                <CardTitle className="text-sm font-bold sm:text-base">Prochains repas</CardTitle>
              </div>
              <Link
                href="/calendar"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Tout voir
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMeals.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="size-10 text-muted-foreground/40" />}
                title="Aucun repas prévu"
                description="Planifiez vos repas pour la semaine depuis le calendrier."
                action={
                  <Link href="/calendar/new" className={buttonVariants({ size: "sm" })}>
                    <Plus className="size-4" />
                    Planifier un repas
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {upcomingMeals.map((meal) => {
                  const responsible =
                    meal.family_members_meal_plans_family_id_responsible_profile_idTofamily_members
                      ?.profiles_family_members_profile_idToprofiles.display_name;

                  return (
                    <Link
                      key={meal.id}
                      href={`/calendar/${meal.id}`}
                      className="group flex items-center gap-2.5 rounded-xl border border-border p-2.5 transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm sm:gap-3 sm:p-3"
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10 ${
                        meal.meal_slot === "lunch"
                          ? "bg-primary/10"
                          : "bg-primary/5"
                      }`}>
                        {meal.meal_slot === "lunch" ? (
                          <UtensilsCrossed className="size-4 text-primary sm:size-5" />
                        ) : (
                          <Clock className="size-4 text-primary sm:size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold group-hover:text-primary sm:text-base">{meal.title}</p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground sm:gap-x-2">
                          <span>
                            {new Date(meal.meal_date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {meal.meal_slot === "lunch" ? "Midi" : "Soir"}
                          </span>
                          {meal.locations && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="size-3" />
                              {meal.locations.name}
                            </span>
                          )}
                          {responsible && <span>{responsible}</span>}
                        </div>
                      </div>
                      <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Recent recipes */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="size-4 text-primary sm:size-5" />
                  <CardTitle className="text-sm font-bold sm:text-base">Dernières recettes</CardTitle>
                </div>
                <Link
                  href="/recipes"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Tout voir
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentRecipes.length === 0 ? (
                <EmptyState
                  icon={<ChefHat className="size-10 text-muted-foreground/40" />}
                  title="Aucune recette"
                  description="Créez votre première recette familiale."
                  action={
                    <Link href="/recipes/new" className={buttonVariants({ size: "sm" })}>
                      <Plus className="size-4" />
                      Ajouter une recette
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {recentRecipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      className="group flex items-center justify-between rounded-xl border border-border p-2.5 transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm sm:p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-9">
                          <ChefHat className="size-4 text-primary" />
                        </div>
                        <p className="truncate text-sm font-semibold group-hover:text-primary sm:text-base">{recipe.title}</p>
                      </div>
                      {recipe.servings && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground sm:px-2.5 sm:py-1">
                          {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopping items */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-primary sm:size-5" />
                  <CardTitle className="text-sm font-bold sm:text-base">Courses à acheter</CardTitle>
                </div>
                <Link
                  href="/shopping"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Ouvrir
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendingShoppingItems.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="size-10 text-muted-foreground/40" />}
                  title="Liste de courses vide"
                  description="Ajoutez des articles ou envoyez les ingrédients d'une recette."
                />
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 sm:max-h-80">
                  {pendingShoppingItems.map((item) => {
                    const quantity = formatShoppingQuantity(item);

                    return (
                      <Link
                        key={item.id}
                        href={`/shopping?locationId=${encodeURIComponent(item.location_id)}`}
                        className="group flex items-start justify-between gap-2.5 rounded-xl border border-border p-2.5 transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm sm:gap-3 sm:p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold group-hover:text-primary sm:text-base">
                            {item.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:gap-2">
                            {item.locations ? (
                              <span className="rounded-full bg-muted px-2 py-0.5">
                                {item.locations.name}
                              </span>
                            ) : null}
                            {quantity ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                {quantity}
                              </span>
                            ) : null}
                          </div>
                          {item.comment ? (
                            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:mt-2">
                              {item.comment}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-1 hidden size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
