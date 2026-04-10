import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "@/components/forms/onboarding-flow";
import { AppPageHeader } from "@/components/layout/app-page-header";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const familyCount = await prisma.family_members.count({
    where: {
      profile_id: session.user.id,
    },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-accent/60 via-background to-primary/5 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppPageHeader
          eyebrow="Onboarding"
          title={
            familyCount > 0
              ? "Ajouter un espace familial"
              : "Bienvenue sur Tablee"
          }
          description={
            familyCount > 0
              ? "Créez une nouvelle famille ou rejoignez-en une existante, sans quitter le même univers visuel que le reste de l’app."
              : "Créez votre premier espace familial ou rejoignez celui de vos proches pour commencer tout de suite."
          }
        />
        <OnboardingFlow hasFamilies={familyCount > 0} />
      </div>
    </main>
  );
}
