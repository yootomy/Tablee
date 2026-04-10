import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { FamilySectionNav } from "@/components/layout/family-section-nav";
import { PageHero } from "@/components/layout/page-hero";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { RevokeFamilyInviteButton } from "@/components/forms/revoke-family-invite-button";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatRole(role: "admin" | "member") {
  return role === "admin" ? "Admin" : "Membre";
}

export default async function FamilyMembersPage() {
  const { familyId, role } = await requireActiveFamily();

  const [family, members, invites] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        created_at: true,
      },
    }),
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
      orderBy: [{ joined_at: "asc" }],
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

  const activeInvites = invites.filter((invite) => {
    const isExpired = invite.expires_at ? invite.expires_at < new Date() : false;
    const isExhausted = invite.uses_count >= invite.max_uses;
    return !isExpired && !isExhausted;
  });

  const sortedMembers = [...members].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "admin" ? -1 : 1;
    }

    return left.profiles_family_members_profile_idToprofiles.display_name.localeCompare(
      right.profiles_family_members_profile_idToprofiles.display_name,
      "fr-CH",
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHero
        eyebrow="Famille active"
        title={family?.name ?? "Famille"}
        description="Gérez les membres, les invitations et vos autres espaces familiaux."
        meta={`${sortedMembers.length} membre${sortedMembers.length > 1 ? "s" : ""}${role === "admin" ? ` • ${activeInvites.length} invitation${activeInvites.length > 1 ? "s" : ""} active${activeInvites.length > 1 ? "s" : ""}` : ""}`}
        action={
          <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
            Créer ou rejoindre une famille
          </Link>
        }
      />

      <FamilySectionNav />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Membres</CardTitle>
            <CardDescription>
              {sortedMembers.length} membre{sortedMembers.length > 1 ? "s" : ""} dans cette
              famille.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedMembers.length === 0 ? (
              <EmptyState
                title="Aucun membre"
                description="Invitez la première personne à rejoindre cette famille."
              />
            ) : (
              <div className="space-y-3">
                {sortedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-border bg-primary/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {member.profiles_family_members_profile_idToprofiles.display_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles_family_members_profile_idToprofiles.email}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {formatRole(member.role)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:gap-4">
                      <span>
                        Rejoint le{" "}
                        {new Date(member.joined_at).toLocaleDateString("fr-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      {member.profiles_family_members_invited_by_profile_idToprofiles ? (
                        <span>
                          Invité par{" "}
                          {member.profiles_family_members_invited_by_profile_idToprofiles.display_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-primary/10 bg-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Votre rôle</CardTitle>
              <CardDescription>
                Les admins peuvent générer des invitations pour de nouveaux membres.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {formatRole(role)}
              </p>
            </CardContent>
          </Card>

          {role === "admin" ? (
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Inviter un membre</CardTitle>
                <CardDescription>
                  Créez un code temporaire à partager avec un proche.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteMemberForm />
              </CardContent>
            </Card>
          ) : null}

          {role === "admin" ? (
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Invitations actives</CardTitle>
                <CardDescription>
                  Les codes ci-dessous sont encore valides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeInvites.length === 0 ? (
                  <EmptyState
                    title="Aucune invitation active"
                    description="Générez un nouveau code pour inviter quelqu'un."
                  />
                ) : (
                  <div className="space-y-3">
                    {activeInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-xl border border-border bg-primary/5 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              Code •••• {invite.code_last4}
                            </p>
                            <p className="text-muted-foreground">
                              Rôle : {formatRole(invite.role_to_grant)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {invite.uses_count}/{invite.max_uses} utilisation
                              {invite.max_uses > 1 ? "s" : ""}
                            </span>
                            <RevokeFamilyInviteButton inviteId={invite.id} />
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Expire le{" "}
                          {invite.expires_at
                            ? new Date(invite.expires_at).toLocaleDateString("fr-CH", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "jamais"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
