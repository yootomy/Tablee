import Link from "next/link";
import { requireActiveFamily } from "@/lib/auth-utils";
import {
  getAiQuotaHeadline,
  getPlanLabel,
  resolveFamilyEntitlements,
} from "@/lib/family-billing";
import { getRecentRecipeImportJobsForFamily } from "@/lib/recipe-import-jobs";
import { getPriceSummaryForMemberCount, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { ProfileSectionNav } from "@/components/layout/profile-section-nav";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BillingActionButton } from "@/components/profile/billing-action-button";
import { RetryRecipeImportButton } from "@/components/recipes/retry-recipe-import-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(value: number | null) {
  if (value === null) {
    return "Gratuit";
  }

  return `${value.toFixed(2).replace(".", ",")} CHF/mois`;
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("fr-CH");
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "trialing":
      return "Essai en cours";
    case "active":
      return "Actif";
    case "past_due":
      return "Paiement en retard";
    case "unpaid":
      return "Impayé";
    case "canceled":
      return "Annulé";
    case "incomplete":
      return "Configuration en attente";
    case "incomplete_expired":
      return "Expiré";
    default:
      return "Free";
  }
}

function getImportStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Réussi";
    case "failed":
      return "Échoué";
    case "processing":
      return "En cours";
    default:
      return status;
  }
}

export default async function BillingPage() {
  const { familyId, role } = await requireActiveFamily();

  const [family, entitlements, importJobs] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    }),
    resolveFamilyEntitlements(familyId),
    getRecentRecipeImportJobsForFamily(familyId, 12),
  ]);

  const priceSummary = getPriceSummaryForMemberCount(entitlements.memberCount);
  const stripeReady = isStripeConfigured();
  const premiumPriceLabel =
    entitlements.plan === "premium"
      ? formatMoney(entitlements.currentPriceEur)
      : formatMoney(priceSummary.priceEur);
  const scheduledTierMessage = entitlements.scheduledTierChange
    ? `Votre prochain renouvellement passera à ${formatMoney(
        entitlements.scheduledTierChange.nextPriceEur,
      )} car votre famille compte maintenant ${entitlements.memberCount} membres.`
    : null;

  const managementCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Gestion de l&apos;abonnement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Premium Famille (1 à 4 membres) – 6,99 CHF/mois
          </p>
          <p className="text-sm text-muted-foreground">
            Premium Famille (5+ membres) – 8,99 CHF/mois
          </p>
          <p className="text-sm text-muted-foreground">
            Le palier suit automatiquement la taille de la famille au prochain renouvellement.
          </p>
        </div>

        {role === "admin" ? (
          <div className="flex flex-col gap-2">
            {entitlements.isPremiumActive ? (
              <BillingActionButton
                actionType="portal"
                label="Gérer l'abonnement"
                variant="outline"
              />
            ) : (
              <BillingActionButton
                actionType="checkout"
                label="Passer au Premium"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Seuls les admins de la famille peuvent gérer la facturation.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Mon profil"
        title={family?.name ?? "Famille"}
        description="Pilote le plan Premium de la famille, les quotas IA et le suivi des imports."
        badges={
          <>
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              {getPlanLabel(entitlements)}
            </span>
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              {entitlements.memberCount} membre{entitlements.memberCount > 1 ? "s" : ""}
            </span>
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

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Plan actuel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan actuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Offre
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {getPlanLabel(entitlements)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Prix
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {premiumPriceLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Statut
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {getStatusLabel(entitlements.status)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Quota IA
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {getAiQuotaHeadline(entitlements)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {entitlements.plan === "premium" && entitlements.trialEndsAt ? (
                  <p>Essai gratuit jusqu&apos;au {formatDate(entitlements.trialEndsAt)}.</p>
                ) : null}
                {entitlements.plan === "premium" && entitlements.currentPeriodEndsAt ? (
                  <p>
                    Prochaine échéance le {formatDate(entitlements.currentPeriodEndsAt)}
                    {entitlements.cancelAtPeriodEnd ? " (annulation déjà programmée)." : "."}
                  </p>
                ) : null}
                {entitlements.plan === "free" ? (
                  <p>
                    Le Premium débloque plus d&apos;imports IA, l&apos;historique complet et la
                    relance des imports échoués.
                  </p>
                ) : null}
                {scheduledTierMessage ? <p>{scheduledTierMessage}</p> : null}
                {!stripeReady ? (
                  <p className="text-destructive">
                    Stripe n&apos;est pas encore configuré sur le serveur. Le plan est prêt côté
                    app, mais la souscription ne peut pas encore s&apos;ouvrir.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Gestion abonnement — visible uniquement sur mobile (sous Plan actuel) */}
          <div className="xl:hidden">{managementCard}</div>

          {/* Quotas d'imports IA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quotas d&apos;imports IA</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-0 xl:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Utilisation 30j
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {entitlements.aiUsage.familyRolling30DayUsed}/{entitlements.aiLimits.familyRolling30Day}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Reste 30j
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {entitlements.aiUsage.familyRolling30DayRemaining}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl border border-border/70 bg-background p-3 sm:p-4 xl:col-span-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Reste aujourd&apos;hui
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {entitlements.aiUsage.familyRolling24hRemaining ?? "Non applicable"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Historique des imports IA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historique des imports IA</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!entitlements.features.importHistory ? (
                <EmptyState
                  title="Historique réservé au Premium"
                  description="Passe au Premium pour suivre les imports, voir les warnings et relancer les échecs."
                  action={
                    role === "admin" && stripeReady ? (
                      <BillingActionButton
                        actionType="checkout"
                        label="Passer au Premium"
                        className="shadow-sm"
                      />
                    ) : null
                  }
                />
              ) : importJobs.length === 0 ? (
                <EmptyState
                  title="Aucun import récent"
                  description="Les prochains imports IA de la famille apparaîtront ici."
                />
              ) : (
                <div className="space-y-3">
                  {importJobs.map((job) => {
                    const metadata =
                      typeof job.metadata === "object" && job.metadata !== null
                        ? (job.metadata as {
                            confidence?: number;
                            warnings?: string[];
                          })
                        : {};
                    const confidenceLabel =
                      typeof metadata.confidence === "number"
                        ? `${Math.round(metadata.confidence * 100)}%`
                        : null;
                    const warnings = Array.isArray(metadata.warnings)
                      ? metadata.warnings
                      : [];

                    return (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-border/70 bg-background p-4"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {job.source_url}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{getImportStatusLabel(job.status)}</span>
                              <span>
                                {new Date(job.created_at).toLocaleDateString("fr-CH")}
                              </span>
                              {confidenceLabel ? <span>Confiance {confidenceLabel}</span> : null}
                            </div>
                            {warnings.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Warnings : {warnings.join(" • ")}
                              </p>
                            ) : null}
                            {job.error_message ? (
                              <p className="text-xs text-destructive">{job.error_message}</p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {job.recipe_id ? (
                              <Link
                                href={`/recipes/${job.recipe_id}`}
                                className={buttonVariants({ size: "sm", variant: "outline", className: "flex-1 justify-center sm:flex-none" })}
                              >
                                Ouvrir la recette
                              </Link>
                            ) : null}
                            {job.status === "failed" ? (
                              <RetryRecipeImportButton jobId={job.id} />
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

        {/* Sidebar — visible uniquement sur xl */}
        <div className="hidden space-y-4 xl:block">
          {managementCard}
        </div>
      </div>
    </div>
  );
}
