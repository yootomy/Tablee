import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

/**
 * Get the active family ID for the current user. Throws if none set.
 */
export async function requireActiveFamily() {
  const profileId = await requireAuth();

  const prefs = await prisma.profile_preferences.findUnique({
    where: { profile_id: profileId },
  });

  if (!prefs?.active_family_id) {
    throw new Error("Aucune famille active");
  }

  // Verify membership
  const membership = await prisma.family_members.findUnique({
    where: {
      family_id_profile_id: {
        family_id: prefs.active_family_id,
        profile_id: profileId,
      },
    },
  });

  if (!membership) {
    throw new Error("Accès refusé à cette famille");
  }

  return {
    profileId,
    familyId: prefs.active_family_id,
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
