import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { CreateLocationForm } from "@/components/forms/create-location-form";
import { EditLocationForm } from "@/components/forms/edit-location-form";
import { FamilySectionNav } from "@/components/layout/family-section-nav";
import { PageHero } from "@/components/layout/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function FamilyLocationsPage() {
  const { familyId } = await requireActiveFamily();

  const [family, locations] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.locations.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
      },
      orderBy: [{ created_at: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHero
        eyebrow="Famille active"
        title={family?.name ?? "Famille"}
        description="Les lieux servent de contexte pour les repas, les courses et la suite du MVP."
        meta={`${locations.length} lieu${locations.length > 1 ? "x" : ""} actif${locations.length > 1 ? "s" : ""}`}
        action={
          <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
            Créer ou rejoindre une famille
          </Link>
        }
      />

      <FamilySectionNav />

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_minmax(0,1.6fr)]">
        <Card className="border-primary/10 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Ajouter un lieu</CardTitle>
            <CardDescription>
              Exemple : maison, studio, chalet ou autre endroit de référence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLocationForm />
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Lieux actifs</CardTitle>
            <CardDescription>
              Renommez vos lieux existants sans perdre leur historique.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    className="rounded-xl border border-border bg-primary/5 p-4"
                  >
                    <div className="mb-3">
                      <p className="font-medium">{location.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Créé le{" "}
                        {new Date(location.created_at).toLocaleDateString("fr-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
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
      </div>
    </div>
  );
}
