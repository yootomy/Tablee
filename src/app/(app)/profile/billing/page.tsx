import Link from "next/link";
import { requireActiveFamily } from "@/lib/auth-utils";
import {
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

function formatSourceUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    const path = pathname.length > 1 ? pathname.slice(0, 30) + (pathname.length > 30 ? "…" : "") : "";
    return host + path;
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? "…" : "");
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
    getRecentRecipeImportJobsForFamily(familyId, 5),
  ]);

  const priceSummary = getPriceSummaryForMemberCount(entitlements.memberCount);
  const stripeReady = isStripeConfigured();
  const premiumPriceLabel =
    entitlements.plan === "premium"
      ? formatMoney(entitlements.currentPriceEur)
      : formatMoney(priceSummary.priceEur);
  const scheduledTierMessage = entitlements.scheduledTierChange
    ? `Prochain renouvellement à ${formatMoney(entitlements.scheduledTierChange.nextPriceEur)} (${entitlements.memberCount} membres).`
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
            Le palier s&apos;ajuste automatiquement au prochain renouvellement.
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
            Seuls les admins peuvent gérer la facturation.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Ma famille"
        title={family?.name ?? "Famille"}
        description="Plan Premium, quotas IA et historique des imports."
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Sidebar — premier dans le DOM pour mobile, droite sur lg+ */}
        <div className="space-y-4 lg:order-last">
          {managementCard}
        </div>

        {/* Contenu principal */}
        <div className="space-y-4">
          {/* Plan actuel + Quotas — en liste compacte */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan actuel</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y">
                <li className="flex items-center justify-between gap-4 pb-3">
                  <span className="text-sm text-muted-foreground">Offre</span>
                  <span className="text-sm font-semibold">{getPlanLabel(entitlements)}</span>
                </li>
                <li className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <span className="text-sm font-semibold">{getStatusLabel(entitlements.status)}</span>
                </li>
                <li className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-muted-foreground">Prix</span>
                  <span className="text-sm font-semibold">{premiumPriceLabel}</span>
                </li>
                {entitlements.plan === "premium" && entitlements.trialEndsAt ? (
                  <li className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-muted-foreground">Essai gratuit jusqu&apos;au</span>
                    <span className="text-sm font-semibold">{formatDate(entitlements.trialEndsAt)}</span>
                  </li>
                ) : null}
                {entitlements.plan === "premium" && entitlements.currentPeriodEndsAt ? (
                  <li className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-muted-foreground">Prochain renouvellement</span>
                    <span className="text-sm font-semibold">
                      {formatDate(entitlements.currentPeriodEndsAt)}
                      {entitlements.cancelAtPeriodEnd ? " (annulé)" : ""}
                    </span>
                  </li>
                ) : null}
                <li className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-muted-foreground">Imports ce mois</span>
                  <span className="text-sm font-semibold">
                    {entitlements.aiUsage.familyRolling30DayUsed} / {entitlements.aiLimits.familyRolling30Day}
                  </span>
                </li>
                {entitlements.aiUsage.familyRolling24hRemaining !== null ? (
                  <li className="flex items-center justify-between gap-4 pt-3">
                    <span className="text-sm text-muted-foreground">Restants aujourd&apos;hui</span>
                    <span className="text-sm font-semibold">{entitlements.aiUsage.familyRolling24hRemaining}</span>
                  </li>
                ) : null}
              </ul>

              {scheduledTierMessage ? (
                <p className="mt-3 text-sm text-muted-foreground">{scheduledTierMessage}</p>
              ) : null}
              {entitlements.plan === "free" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Le Premium débloque plus d&apos;imports IA, l&apos;historique complet et la relance des imports échoués.
                </p>
              ) : null}
              {!stripeReady ? (
                <p className="mt-3 text-sm text-destructive">
                  Stripe n&apos;est pas encore configuré sur le serveur.
                </p>
              ) : null}
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
                  description="Passe au Premium pour suivre les imports et relancer les échecs."
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
                <ul className="divide-y">
                  {importJobs.map((job) => {
                    const metadata =
                      typeof job.metadata === "object" && job.metadata !== null
                        ? (job.metadata as { confidence?: number; warnings?: string[] })
                        : {};
                    const confidenceLabel =
                      typeof metadata.confidence === "number"
                        ? `${Math.round(metadata.confidence * 100)}%`
                        : null;
                    const warnings = Array.isArray(metadata.warnings) ? metadata.warnings : [];

                    return (
                      <li key={job.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {formatSourceUrl(job.source_url)}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                              <span>{getImportStatusLabel(job.status)}</span>
                              <span>{new Date(job.created_at).toLocaleDateString("fr-CH")}</span>
                              {confidenceLabel ? <span>{confidenceLabel}</span> : null}
                            </div>
                            {warnings.length > 0 ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {warnings.join(" · ")}
                              </p>
                            ) : null}
                            {job.error_message ? (
                              <p className="mt-0.5 text-xs text-destructive">{job.error_message}</p>
                            ) : null}
                          </div>
                        </div>

                        {(job.recipe_id || job.status === "failed") ? (
                          <div className="flex gap-2">
                            {job.recipe_id ? (
                              <Link
                                href={`/recipes/${job.recipe_id}`}
                                className={buttonVariants({ size: "sm", variant: "outline", className: "flex-1 justify-center" })}
                              >
                                Ouvrir la recette
                              </Link>
                            ) : null}
                            {job.status === "failed" ? (
                              <RetryRecipeImportButton jobId={job.id} />
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
