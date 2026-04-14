import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { resolveFamilyEntitlements } from "@/lib/family-billing";
import { getPreferredLocationId } from "@/lib/location-preferences";
import { resolveRecipeMediaUrl } from "@/lib/media-url";
import { formatDuration } from "@/lib/formatters";
import { computeDietaryConflicts } from "@/lib/dietary";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { RecipeSourceViewerDialog } from "@/components/recipes/recipe-source-viewer-dialog";
import { RecipeDetailClient } from "@/components/recipes/recipe-detail-client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Clock,
  ChefHat,
  Flame,
  Users,
  ExternalLink,
  Pencil,
  ArrowLeft,
  TriangleAlert,
} from "lucide-react";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { familyId, profileId } = await requireActiveFamily();
  const { id } = await params;

  const [recipe, locations, familyContextPreferences, entitlements, familyMembersWithPrefs] = await Promise.all([
    prisma.recipes.findFirst({
      where: { id, family_id: familyId, archived_at: null },
      include: {
        recipe_ingredients: { orderBy: { position: "asc" } },
        recipe_steps: { orderBy: { position: "asc" } },
      },
    }),
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: { created_at: "asc" },
      select: { id: true, name: true },
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
    resolveFamilyEntitlements(familyId),
    prisma.family_members.findMany({
      where: { family_id: familyId },
      select: {
        profiles_family_members_profile_idToprofiles: { select: { display_name: true } },
        member_dietary_preferences: { select: { type: true, value: true } },
      },
    }),
  ]);

  if (!recipe) notFound();

  const dietaryConflicts = entitlements.isPremiumActive
    ? computeDietaryConflicts(
        recipe,
        familyMembersWithPrefs.flatMap((m) =>
          m.member_dietary_preferences.map((pref) => ({
            memberName: m.profiles_family_members_profile_idToprofiles.display_name,
            type: pref.type,
            value: pref.value,
          })),
        ),
      )
    : [];

  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const recipeImageUrl = resolveRecipeMediaUrl(recipe.id, recipe.image_url);
  const preferredLocationId = getPreferredLocationId(
    locations,
    familyContextPreferences?.last_selected_location_id,
  );

  const stats = [
    recipe.servings
      ? { icon: Users, label: `${recipe.servings} portion${recipe.servings > 1 ? "s" : ""}` }
      : null,
    recipe.prep_time_minutes
      ? { icon: ChefHat, label: `Prépa ${formatDuration(recipe.prep_time_minutes)}` }
      : null,
    recipe.cook_time_minutes
      ? { icon: Flame, label: `Cuisson ${formatDuration(recipe.cook_time_minutes)}` }
      : null,
    totalMinutes
      ? { icon: Clock, label: `Total ${formatDuration(totalMinutes)}` }
      : null,
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string }[];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title={recipe.title}
        description={
          recipe.description?.trim() ||
          "Une fiche claire à ouvrir seulement quand tu veux tous les détails."
        }
        backgroundImageUrl={recipeImageUrl ?? undefined}
        badges={
          <>
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm"
              >
                <s.icon className="size-3.5" />
                {s.label}
              </span>
            ))}
          </>
        }
        action={
          <>
            <Link
              href="/recipes"
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              <ArrowLeft className="size-3.5" />
              Recettes
            </Link>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              <Pencil className="size-3.5" />
              Modifier
            </Link>
            <DeleteRecipeButton recipeId={recipe.id} recipeTitle={recipe.title} />
          </>
        }
      >
        {recipe.source_url ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <RecipeSourceViewerDialog
              sourceUrl={recipe.source_url}
              title={recipe.title}
            />
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-white/75 hover:text-white hover:underline"
            >
              <ExternalLink className="size-3" />
              Source originale
            </a>
          </div>
        ) : null}
      </AppPageHeader>

      {/* Alertes alimentaires */}
      {dietaryConflicts.length > 0 ? (
        <div className="space-y-2">
          {dietaryConflicts.map((conflict) => (
            <div
              key={`${conflict.type}:${conflict.value}`}
              className={
                conflict.type === "allergen"
                  ? "flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
                  : "flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"
              }
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {conflict.type === "allergen"
                  ? `Contient ${conflict.label}`
                  : `Non ${conflict.label.toLowerCase()}`}
                {" · "}
                Affecte&nbsp;: {conflict.memberNames.join(", ")}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Contenu principal */}
      <RecipeDetailClient
        baseServings={recipe.servings}
        ingredients={recipe.recipe_ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity_numeric: ing.quantity_numeric !== null ? Number(ing.quantity_numeric.toString()) : null,
          unit: ing.unit,
          raw_quantity_text: ing.raw_quantity_text,
          note: ing.note,
        }))}
        steps={recipe.recipe_steps.map((s) => ({
          id: s.id,
          instruction: s.instruction,
        }))}
        recipeId={recipe.id}
        locations={locations.map((l) => ({ id: l.id, label: l.name }))}
        defaultLocationId={preferredLocationId ?? locations[0]?.id ?? null}
        createdAt={recipe.created_at.toISOString()}
        updatedAt={recipe.updated_at.toISOString()}
      />
    </div>
  );
}
