"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireActiveFamily,
  requireActiveFamilyAdmin,
  requireAuth,
} from "@/lib/auth-utils";
import {
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  normalizeInviteCode,
} from "@/lib/family-invites";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const createFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit faire au moins 2 caractères"),
  locationName: z.string().trim().min(1, "Le nom du lieu est requis"),
});

const joinFamilySchema = z.object({
  code: z.string().trim().min(6, "Le code d'invitation est requis"),
});

const createInviteSchema = z.object({
  roleToGrant: z.enum(["admin", "member"]).default("member"),
  maxUses: z.coerce
    .number()
    .int()
    .min(1, "Le code doit pouvoir être utilisé au moins une fois")
    .max(25, "Le nombre d'utilisations doit rester raisonnable"),
  expiresInDays: z.coerce
    .number()
    .int()
    .min(1, "La durée doit être d'au moins 1 jour")
    .max(30, "La durée maximale est de 30 jours"),
});

const revokeInviteSchema = z.object({
  inviteId: z.string().uuid("L'invitation demandée est invalide"),
});

const removeMemberSchema = z.object({
  memberId: z.string().uuid("Le membre demandé est invalide"),
});

async function persistFamily(
  profileId: string,
  name: string,
  locationName: string,
) {
  return prisma.$transaction(async (tx) => {
    const family = await tx.families.create({
      data: {
        name,
        created_by_profile_id: profileId,
      },
    });

    await tx.family_members.create({
      data: {
        family_id: family.id,
        profile_id: profileId,
        role: "admin",
      },
    });

    await tx.locations.create({
      data: {
        family_id: family.id,
        name: locationName,
      },
    });

    await tx.profile_preferences.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        active_family_id: family.id,
      },
      update: {
        active_family_id: family.id,
      },
    });

    return family;
  });
}

export async function createFamily(formData: FormData) {
  const profileId = await requireAuth();

  const parsed = createFamilySchema.safeParse({
    name: formData.get("name"),
    locationName: formData.get("locationName"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, locationName } = parsed.data;

  await persistFamily(profileId, name, locationName);

  redirect("/dashboard");
}

export async function joinFamilyWithCode(
  formData: FormData,
): Promise<ActionResult> {
  const profileId = await requireAuth();

  const parsed = joinFamilySchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const normalizedCode = normalizeInviteCode(parsed.data.code);
  const invite = await prisma.family_invites.findUnique({
    where: {
      code_hash: hashInviteCode(normalizedCode),
    },
  });

  if (!invite) {
    return { success: false, error: "Ce code d'invitation est invalide" };
  }

  if (invite.revoked_at) {
    return { success: false, error: "Cette invitation a été révoquée" };
  }

  if (invite.expires_at && invite.expires_at < new Date()) {
    return { success: false, error: "Cette invitation a expiré" };
  }

  if (invite.uses_count >= invite.max_uses) {
    return {
      success: false,
      error: "Ce code d'invitation a déjà atteint sa limite d'utilisation",
    };
  }

  const existingMembership = await prisma.family_members.findUnique({
    where: {
      family_id_profile_id: {
        family_id: invite.family_id,
        profile_id: profileId,
      },
    },
  });

  if (existingMembership) {
    await prisma.profile_preferences.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        active_family_id: invite.family_id,
      },
      update: {
        active_family_id: invite.family_id,
      },
    });

    redirect("/dashboard");
  }

  await prisma.$transaction(async (tx) => {
    await tx.family_members.create({
      data: {
        family_id: invite.family_id,
        profile_id: profileId,
        role: invite.role_to_grant,
        invited_by_profile_id: invite.created_by_profile_id,
      },
    });

    await tx.family_invites.update({
      where: { id: invite.id },
      data: {
        uses_count: {
          increment: 1,
        },
      },
    });

    await tx.profile_preferences.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        active_family_id: invite.family_id,
      },
      update: {
        active_family_id: invite.family_id,
      },
    });
  });

  redirect("/dashboard");
}

export async function createFamilyInvite(
  formData: FormData,
): Promise<
  ActionResult<{
    code: string;
    sharePath: string;
    expiresAt: string;
  }>
> {
  const { profileId, familyId } = await requireActiveFamilyAdmin();

  const parsed = createInviteSchema.safeParse({
    roleToGrant: formData.get("roleToGrant"),
    maxUses: formData.get("maxUses"),
    expiresInDays: formData.get("expiresInDays"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { roleToGrant, maxUses, expiresInDays } = parsed.data;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const code = generateInviteCode();

  await prisma.family_invites.create({
    data: {
      family_id: familyId,
      created_by_profile_id: profileId,
      role_to_grant: roleToGrant,
      code_hash: hashInviteCode(code),
      code_last4: normalizeInviteCode(code).slice(-4),
      max_uses: maxUses,
      expires_at: expiresAt,
    },
  });

  revalidatePath("/family/members");

  return {
    success: true,
    data: {
      code: formatInviteCode(code),
      sharePath: `/onboarding?code=${encodeURIComponent(formatInviteCode(code))}`,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export async function revokeFamilyInvite(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId } = await requireActiveFamilyAdmin();

  const parsed = revokeInviteSchema.safeParse({
    inviteId: formData.get("inviteId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const invite = await prisma.family_invites.findFirst({
    where: {
      id: parsed.data.inviteId,
      family_id: familyId,
      revoked_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!invite) {
    return { success: false, error: "Cette invitation est introuvable ou déjà révoquée" };
  }

  await prisma.family_invites.update({
    where: { id: invite.id },
    data: {
      revoked_at: new Date(),
    },
  });

  revalidatePath("/family/members");

  return { success: true };
}

export async function removeFamilyMember(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamilyAdmin();

  const parsed = removeMemberSchema.safeParse({
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const member = await prisma.family_members.findFirst({
    where: {
      id: parsed.data.memberId,
      family_id: familyId,
    },
    select: {
      id: true,
      profile_id: true,
      role: true,
      profiles_family_members_profile_idToprofiles: {
        select: {
          display_name: true,
        },
      },
    },
  });

  if (!member) {
    return { success: false, error: "Ce membre est introuvable" };
  }

  if (member.profile_id === profileId) {
    return {
      success: false,
      error: "Tu ne peux pas te retirer toi-même de la famille pour l'instant",
    };
  }

  if (member.role === "admin") {
    const adminCount = await prisma.family_members.count({
      where: {
        family_id: familyId,
        role: "admin",
      },
    });

    if (adminCount <= 1) {
      return {
        success: false,
        error: "Impossible de retirer le dernier admin de la famille",
      };
    }
  }

  const fallbackMembership = await prisma.family_members.findFirst({
    where: {
      profile_id: member.profile_id,
      family_id: { not: familyId },
    },
    orderBy: { joined_at: "asc" },
    select: { family_id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.recipes.updateMany({
      where: {
        family_id: familyId,
        created_by_profile_id: member.profile_id,
      },
      data: {
        created_by_profile_id: profileId,
      },
    });

    await tx.recipes.updateMany({
      where: {
        family_id: familyId,
        updated_by_profile_id: member.profile_id,
      },
      data: {
        updated_by_profile_id: profileId,
      },
    });

    await tx.meal_plans.updateMany({
      where: {
        family_id: familyId,
        created_by_profile_id: member.profile_id,
      },
      data: {
        created_by_profile_id: profileId,
      },
    });

    await tx.meal_plans.updateMany({
      where: {
        family_id: familyId,
        responsible_profile_id: member.profile_id,
      },
      data: {
        responsible_profile_id: null,
      },
    });

    await tx.shopping_items.updateMany({
      where: {
        family_id: familyId,
        created_by_profile_id: member.profile_id,
      },
      data: {
        created_by_profile_id: profileId,
      },
    });

    await tx.shopping_items.updateMany({
      where: {
        family_id: familyId,
        completed_by_profile_id: member.profile_id,
      },
      data: {
        completed_by_profile_id: null,
      },
    });

    await tx.family_context_preferences.deleteMany({
      where: {
        family_id: familyId,
        profile_id: member.profile_id,
      },
    });

    await tx.profile_preferences.updateMany({
      where: {
        profile_id: member.profile_id,
        active_family_id: familyId,
      },
      data: {
        active_family_id: fallbackMembership?.family_id ?? null,
      },
    });

    await tx.family_members.delete({
      where: {
        id: member.id,
      },
    });
  });

  revalidatePath("/family/members");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function switchFamily(familyId: string) {
  const profileId = await requireAuth();

  const membership = await prisma.family_members.findUnique({
    where: {
      family_id_profile_id: {
        family_id: familyId,
        profile_id: profileId,
      },
    },
  });

  if (!membership) {
    return { success: false, error: "Accès refusé" };
  }

  await prisma.profile_preferences.upsert({
    where: { profile_id: profileId },
    create: {
      profile_id: profileId,
      active_family_id: familyId,
    },
    update: {
      active_family_id: familyId,
    },
  });

  redirect("/dashboard");
}

export async function getUserFamilies() {
  const profileId = await requireAuth();

  const memberships = await prisma.family_members.findMany({
    where: { profile_id: profileId },
    include: { families: true },
    orderBy: { joined_at: "asc" },
  });

  const prefs = await prisma.profile_preferences.findUnique({
    where: { profile_id: profileId },
  });

  return {
    families: memberships.map((membership) => ({
      id: membership.families.id,
      name: membership.families.name,
      role: membership.role,
    })),
    activeFamilyId: prefs?.active_family_id ?? null,
  };
}

export async function getActiveFamilySummary() {
  const { familyId, profileId, role } = await requireActiveFamily();

  const family = await prisma.families.findUnique({
    where: { id: familyId },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
  });

  if (!family) {
    throw new Error("Famille introuvable");
  }

  const [members, invites] = await Promise.all([
    prisma.family_members.findMany({
      where: { family_id: familyId },
      include: {
        profiles_family_members_profile_idToprofiles: {
          select: {
            display_name: true,
            email: true,
          },
        },
        profiles_family_members_invited_by_profile_idToprofiles: {
          select: {
            display_name: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joined_at: "asc" }],
    }),
    prisma.family_invites.findMany({
      where: {
        family_id: familyId,
        revoked_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  return {
    family,
    currentUserRole: role,
    currentProfileId: profileId,
    members: members.map((member) => ({
      id: member.id,
      profileId: member.profile_id,
      name: member.profiles_family_members_profile_idToprofiles.display_name,
      email: member.profiles_family_members_profile_idToprofiles.email,
      role: member.role,
      joinedAt: member.joined_at.toISOString(),
      invitedBy:
        member.profiles_family_members_invited_by_profile_idToprofiles
          ?.display_name ?? null,
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      roleToGrant: invite.role_to_grant,
      codeLast4: invite.code_last4,
      maxUses: invite.max_uses,
      usesCount: invite.uses_count,
      expiresAt: invite.expires_at?.toISOString() ?? null,
      createdAt: invite.created_at.toISOString(),
    })),
  };
}
