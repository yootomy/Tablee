import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "@/components/forms/onboarding-flow";

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <OnboardingFlow hasFamilies={familyCount > 0} />
    </div>
  );
}
