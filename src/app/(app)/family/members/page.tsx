import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { FamilySectionNav } from "@/components/layout/family-section-nav";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { RevokeFamilyInviteButton } from "@/components/forms/revoke-family-invite-button";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserPlus } from "lucide-react";

function formatRole(role: "admin" | "member") {
  return role === "admin" ? "Admin" : "Membre";
}

export default async function FamilyMembersPage() {
  const { familyId, role } = await requireActiveFamily();

  const [family, members, invites] = await Promise.all([
    prisma.families.findUnique({
      where: { id: familyId },
      select: { id: true, name: true, created_at: true },
    }),
    prisma.family_members.findMany({
      where: { family_id: familyId },
      include: {
        profiles_family_members_profile_idToprofiles: {
          select: { display_name: true, email: true },
        },
        profiles_family_members_invited_by_profile_idToprofiles: {
          select: { display_name: true },
        },
      },
      orderBy: [{ joined_at: "asc" }],
    }),
    prisma.family_invites.findMany({
      where: { family_id: familyId, revoked_at: null },
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
    if (left.role !== right.role) return left.role === "admin" ? -1 : 1;
    return left.profiles_family_members_profile_idToprofiles.display_name.localeCompare(
      right.profiles_family_members_profile_idToprofiles.display_name,
      "fr-CH",
    );
  });

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header compact */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-accent/80 to-primary/5 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-primary">Famille active</p>
          <Link href="/onboarding" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Créer ou rejoindre
          </Link>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{family?.name ?? "Famille"}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {sortedMembers.length} membre{sortedMembers.length > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            {formatRole(role)}
          </span>
          {role === "admin" && activeInvites.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
              <UserPlus className="size-3.5" />
              {activeInvites.length} invitation{activeInvites.length > 1 ? "s" : ""} active{activeInvites.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </div>

      <FamilySectionNav />

      {/* Contenu */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Membres */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Membres
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sortedMembers.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {sortedMembers.length === 0 ? (
              <EmptyState
                title="Aucun membre"
                description="Invitez la première personne à rejoindre cette famille."
              />
            ) : (
              <ul className="divide-y">
                {sortedMembers.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {member.profiles_family_members_profile_idToprofiles.display_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.profiles_family_members_profile_idToprofiles.email}
                        {member.profiles_family_members_invited_by_profile_idToprofiles
                          ? ` • invité par ${member.profiles_family_members_invited_by_profile_idToprofiles.display_name}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {formatRole(member.role)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {role === "admin" ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="size-4" />
                  Inviter un membre
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InviteMemberForm />
              </CardContent>
            </Card>
          ) : null}

          {role === "admin" && activeInvites.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Invitations actives
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({activeInvites.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {activeInvites.map((invite) => (
                    <li key={invite.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="text-sm">
                        <p className="font-medium">Code •••• {invite.code_last4}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRole(invite.role_to_grant)} • {invite.uses_count}/{invite.max_uses} util.
                          {invite.expires_at
                            ? ` • exp. ${new Date(invite.expires_at).toLocaleDateString("fr-CH")}`
                            : ""}
                        </p>
                      </div>
                      <RevokeFamilyInviteButton inviteId={invite.id} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
