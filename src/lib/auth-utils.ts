import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type FamilyMembershipRecord = {
  family_id: string;
  role: string;
};

/**
 * Get the current session profile ID. Throws if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Non authentifié");
  }
  return session.user.id;
}

export function resolveActiveFamilyId<T extends FamilyMembershipRecord>(
  memberships: T[],
  preferredFamilyId: string | null | undefined,
) {
  if (
    preferredFamilyId &&
    memberships.some((membership) => membership.family_id === preferredFamilyId)
  ) {
    return preferredFamilyId;
  }

  return memberships[0]?.family_id ?? null;
}

export async function getResolvedFamilyMemberships(profileId: string) {
  const [memberships, prefs] = await Promise.all([
    prisma.family_members.findMany({
      where: { profile_id: profileId },
      include: { families: true },
      orderBy: { joined_at: "asc" },
    }),
    prisma.profile_preferences.findUnique({
      where: { profile_id: profileId },
    }),
  ]);

  return {
    memberships,
    activeFamilyId: resolveActiveFamilyId(memberships, prefs?.active_family_id),
  };
}

/**
 * Get the active family ID for the current user. Throws if none set.
 */
export async function requireActiveFamily() {
  const profileId = await requireAuth();

  const memberships = await prisma.family_members.findMany({
    where: { profile_id: profileId },
    orderBy: { joined_at: "asc" },
  });

  const prefs = await prisma.profile_preferences.findUnique({
    where: { profile_id: profileId },
  });
  const activeFamilyId = resolveActiveFamilyId(memberships, prefs?.active_family_id);

  if (!activeFamilyId) {
    throw new Error("Aucune famille active");
  }

  const membership = memberships.find(
    (candidate) => candidate.family_id === activeFamilyId,
  );

  if (!membership) {
    throw new Error("Accès refusé à cette famille");
  }

  return {
    profileId,
    familyId: activeFamilyId,
    role: membership.role,
  };
}

/**
 * Get the active family context and ensure the current user is an admin.
 */
export async function requireActiveFamilyAdmin() {
  const context = await requireActiveFamily();

  if (context.role !== "admin") {
    throw new Error("Accès refusé");
  }

  return context;
}
