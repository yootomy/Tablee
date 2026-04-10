import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { CreateLocationForm } from "@/components/forms/create-location-form";
import { EditLocationForm } from "@/components/forms/edit-location-form";
import { FamilySectionNav } from "@/components/layout/family-section-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus } from "lucide-react";

export default async function FamilyLocationsPage() {
  const { familyId } = await requireActiveFamily();

  const [family, locations] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    }),
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: [{ created_at: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-white shadow-lg sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Famille active</p>
          <Link href="/onboarding" className={buttonVariants({ size: "sm", variant: "outline", className: "border-white/25 bg-white/10 text-white hover:bg-white/20" })}>
            Créer ou rejoindre
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{family?.name ?? "Famille"}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <MapPin className="size-3.5" />
            {locations.length} lieu{locations.length > 1 ? "x" : ""} actif{locations.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <FamilySectionNav />

      {/* Contenu */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{location.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(location.created_at).toLocaleDateString("fr-CH")}
                      </span>
                    </div>
                    <EditLocationForm
                      locationId={location.id}
                      initialName={location.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar : ajout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" />
              Ajouter un lieu
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-xs text-muted-foreground">
              Ex : maison, studio, chalet ou autre endroit de référence.
            </p>
            <CreateLocationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
