import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FamilySwitcher } from "@/components/layout/family-switcher";
import { NavLinks, BottomNav } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profileId = session.user.id;

  // Get user families
  const memberships = await prisma.family_members.findMany({
    where: { profile_id: profileId },
    include: { families: true },
  });

  // No families -> onboarding
  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const prefs = await prisma.profile_preferences.findUnique({
    where: { profile_id: profileId },
  });

  // No active family -> set first one
  if (!prefs?.active_family_id) {
    await prisma.profile_preferences.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        active_family_id: memberships[0].families.id,
      },
      update: {
        active_family_id: memberships[0].families.id,
      },
    });
  }

  const families = memberships.map((m) => ({
    id: m.families.id,
    name: m.families.name,
    role: m.role,
  }));

  const activeFamilyId = prefs?.active_family_id ?? memberships[0].families.id;

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden md:min-h-screen md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-accent/30 md:flex md:flex-col">
        <div className="flex items-center gap-2.5 p-5">
          <Image src="/logo-tablee-nobg.png" alt="" width={36} height={36} className="size-9" />
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Tablee</h1>
        </div>
        <div className="px-4">
          <FamilySwitcher families={families} activeFamilyId={activeFamilyId} />
        </div>
        <Separator className="my-3" />
        <NavLinks className="flex flex-col gap-1 px-3" />
        <div className="mt-auto border-t border-border p-4">
          <UserMenu name={session.user.name ?? "Utilisateur"} />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2.5 backdrop-blur-sm [padding-left:max(env(safe-area-inset-left),1rem)] [padding-right:max(env(safe-area-inset-right),1rem)] md:hidden">
        <div className="flex shrink-0 items-center gap-2">
          <Image src="/logo-tablee-nobg.png" alt="" width={28} height={28} className="size-7" />
          <h1 className="text-lg font-extrabold tracking-tight text-primary">Tablee</h1>
        </div>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5">
          <FamilySwitcher
            families={families}
            activeFamilyId={activeFamilyId}
            fullWidth={false}
            triggerClassName="h-8 px-3 text-xs"
          />
          <UserMenu name={session.user.name ?? "Utilisateur"} compact />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 bg-muted/20 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
