# Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser la section `/profile` en deux groupes distincts — "Ma famille" (Membres, Lieux, Abonnement) et "Mon compte" (nom d'affichage + alimentaire) — et créer la page `/profile/compte`.

**Architecture:** La page `/profile` devient un redirect vers `/profile/membres`. Le contenu des membres déménage dans un nouveau sous-dossier. Une nouvelle page `/profile/compte` fusionne le changement de nom d'affichage et les préférences alimentaires. La navigation `ProfileSectionNav` est redesignée avec deux groupes visuels.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma, Tailwind CSS, Server Actions

---

## Fichiers concernés

| Action | Fichier |
|--------|---------|
| Créer | `src/app/(app)/profile/compte/actions.ts` |
| Créer | `src/app/(app)/profile/compte/page.tsx` |
| Créer | `src/app/(app)/profile/membres/page.tsx` |
| Modifier → redirect | `src/app/(app)/profile/page.tsx` |
| Modifier (eyebrow) | `src/app/(app)/profile/lieux/page.tsx` |
| Modifier (eyebrow) | `src/app/(app)/profile/billing/page.tsx` |
| Réécrire | `src/components/layout/profile-section-nav.tsx` |
| Supprimer | `src/app/(app)/profile/dietary/page.tsx` |
| Supprimer | `src/app/(app)/profile/dietary/actions.ts` |

---

## Task 1 : Créer `compte/actions.ts`

Regroupe les deux Server Actions de la page `/profile/compte` : changement de nom + préférences alimentaires (déplacé depuis `dietary/actions.ts`).

**Files:**
- Create: `src/app/(app)/profile/compte/actions.ts`

- [ ] **Étape 1 : Créer le fichier `compte/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { ALL_REGIME_VALUES, ALL_ALLERGEN_VALUES } from "@/lib/dietary";

export async function updateDisplayName(formData: FormData): Promise<void> {
  const { profileId } = await requireActiveFamily();
  const displayName = formData.get("displayName");

  if (
    typeof displayName !== "string" ||
    displayName.trim().length < 2 ||
    displayName.trim().length > 50
  ) {
    throw new Error("Le nom doit faire entre 2 et 50 caractères.");
  }

  await prisma.profiles.update({
    where: { id: profileId },
    data: { display_name: displayName.trim() },
  });

  revalidatePath("/profile/compte");
}

export async function saveDietaryPreferences(formData: FormData): Promise<void> {
  const { familyId, profileId } = await requireActiveFamily();

  const member = await prisma.family_members.findUnique({
    where: { family_id_profile_id: { family_id: familyId, profile_id: profileId } },
    select: { id: true },
  });

  if (!member) {
    throw new Error("Membre introuvable dans cette famille.");
  }

  const selectedRegimes = ALL_REGIME_VALUES.filter(
    (v) => formData.get(`regime_${v}`) === "on",
  );
  const selectedAllergens = ALL_ALLERGEN_VALUES.filter(
    (v) => formData.get(`allergen_${v}`) === "on",
  );

  await prisma.$transaction(async (tx) => {
    await tx.member_dietary_preferences.deleteMany({
      where: { family_member_id: member.id },
    });

    const toCreate = [
      ...selectedRegimes.map((v) => ({
        family_member_id: member.id,
        type: "regime" as const,
        value: v,
      })),
      ...selectedAllergens.map((v) => ({
        family_member_id: member.id,
        type: "allergen" as const,
        value: v,
      })),
    ];

    if (toCreate.length > 0) {
      await tx.member_dietary_preferences.createMany({ data: toCreate });
    }
  });

  revalidatePath("/profile/compte");
}
```

- [ ] **Étape 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit src/app/\(app\)/profile/compte/actions.ts
```

Résultat attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add src/app/\(app\)/profile/compte/actions.ts
git commit -m "feat(profile): créer actions compte (displayName + dietary)"
```

---

## Task 2 : Créer `compte/page.tsx`

Nouvelle page "Mon compte" avec le bloc nom d'affichage et le bloc préférences alimentaires (premium-gated).

**Files:**
- Create: `src/app/(app)/profile/compte/page.tsx`

- [ ] **Étape 1 : Créer le fichier `compte/page.tsx`**

```tsx
import { requireActiveFamily } from "@/lib/auth-utils";
import { resolveFamilyEntitlements } from "@/lib/family-billing";
import { prisma } from "@/lib/prisma";
import { DIETARY_REGIMES, DIETARY_ALLERGENS } from "@/lib/dietary";
import { isStripeConfigured } from "@/lib/stripe";
import { ProfileSectionNav } from "@/components/layout/profile-section-nav";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BillingActionButton } from "@/components/profile/billing-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName, saveDietaryPreferences } from "./actions";

export default async function ComptePage() {
  const { familyId, profileId, role } = await requireActiveFamily();

  const [profile, entitlements, member] = await Promise.all([
    prisma.profiles.findUnique({
      where: { id: profileId },
      select: { display_name: true },
    }),
    resolveFamilyEntitlements(familyId),
    prisma.family_members.findUnique({
      where: { family_id_profile_id: { family_id: familyId, profile_id: profileId } },
      select: {
        id: true,
        member_dietary_preferences: { select: { type: true, value: true } },
      },
    }),
  ]);

  const savedRegimes = new Set(
    member?.member_dietary_preferences
      .filter((p) => p.type === "regime")
      .map((p) => p.value) ?? [],
  );
  const savedAllergens = new Set(
    member?.member_dietary_preferences
      .filter((p) => p.type === "allergen")
      .map((p) => p.value) ?? [],
  );

  const stripeReady = isStripeConfigured();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Mon compte"
        title={profile?.display_name ?? "Mon compte"}
        description="Ton nom d'affichage et tes préférences alimentaires."
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProfileSectionNav inverse />
        </div>
      </AppPageHeader>

      <div className="space-y-4">
        {/* Bloc 1 — Nom d'affichage */}
        <form action={updateDisplayName}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nom d&apos;affichage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nom</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={profile?.display_name ?? ""}
                  minLength={2}
                  maxLength={50}
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Bloc 2 — Préférences alimentaires */}
        {!entitlements.isPremiumActive ? (
          <EmptyState
            title="Préférences alimentaires — Premium"
            description="Passe au Premium pour renseigner tes contraintes alimentaires et recevoir des alertes sur les recettes."
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
        ) : (
          <form action={saveDietaryPreferences}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Préférences alimentaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Régimes</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {DIETARY_REGIMES.map((regime) => (
                      <label key={regime.value} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          name={`regime_${regime.value}`}
                          defaultChecked={savedRegimes.has(regime.value)}
                          className="size-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm">{regime.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Allergènes</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {DIETARY_ALLERGENS.map((allergen) => (
                      <label key={allergen.value} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          name={`allergen_${allergen.value}`}
                          defaultChecked={savedAllergens.has(allergen.value)}
                          className="size-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm">{allergen.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full sm:w-auto">
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/app/\(app\)/profile/compte/page.tsx
git commit -m "feat(profile): créer page Mon compte (nom + alimentaire)"
```

---

## Task 3 : Créer `membres/page.tsx`

Déplacer le contenu de l'actuelle `/profile/page.tsx` vers `/profile/membres/page.tsx` en changeant l'eyebrow.

**Files:**
- Create: `src/app/(app)/profile/membres/page.tsx`

- [ ] **Étape 1 : Créer le fichier `membres/page.tsx`**

```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { ProfileSectionNav } from "@/components/layout/profile-section-nav";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { RemoveFamilyMemberButton } from "@/components/forms/remove-family-member-button";
import { RevokeFamilyInviteButton } from "@/components/forms/revoke-family-invite-button";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserPlus } from "lucide-react";

function formatRole(role: "admin" | "member") {
  return role === "admin" ? "Admin" : "Membre";
}

export default async function MembresPage() {
  const { familyId, role, profileId } = await requireActiveFamily();

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
      <AppPageHeader
        eyebrow="Ma famille"
        title={family?.name ?? "Famille"}
        description="Retrouve les membres, gère les invitations et les lieux de ta famille."
        badges={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <Users className="size-3.5" />
              {sortedMembers.length} membre{sortedMembers.length > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <Shield className="size-3.5" />
              {formatRole(role)}
            </span>
            {role === "admin" && activeInvites.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-xs text-white">
                <UserPlus className="size-3.5" />
                {activeInvites.length} invitation{activeInvites.length > 1 ? "s" : ""} active{activeInvites.length > 1 ? "s" : ""}
              </span>
            ) : null}
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
        {role === "admin" ? (
          <div className="space-y-4 lg:order-last">
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

            {activeInvites.length > 0 ? (
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
        ) : null}

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
                  <li key={member.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
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
                      </div>
                      {role === "admin" && member.profile_id !== profileId ? (
                        <div className="mt-2">
                          <RemoveFamilyMemberButton
                            memberId={member.id}
                            memberName={member.profiles_family_members_profile_idToprofiles.display_name}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/app/\(app\)/profile/membres/page.tsx
git commit -m "feat(profile): créer page Membres sous /profile/membres"
```

---

## Task 4 : Convertir `/profile/page.tsx` en redirect

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`

- [ ] **Étape 1 : Remplacer le contenu de `profile/page.tsx`**

Le nouveau contenu complet du fichier :

```tsx
import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/profile/membres");
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/app/\(app\)/profile/page.tsx
git commit -m "feat(profile): /profile redirige vers /profile/membres"
```

---

## Task 5 : Mettre à jour l'eyebrow sur lieux et billing

**Files:**
- Modify: `src/app/(app)/profile/lieux/page.tsx`
- Modify: `src/app/(app)/profile/billing/page.tsx`

- [ ] **Étape 1 : Dans `lieux/page.tsx`, remplacer `eyebrow="Mon profil"` par `eyebrow="Ma famille"`**

Chercher la ligne :
```tsx
eyebrow="Mon profil"
```
Remplacer par :
```tsx
eyebrow="Ma famille"
```

- [ ] **Étape 2 : Dans `billing/page.tsx`, faire la même substitution**

Chercher la ligne :
```tsx
eyebrow="Mon profil"
```
Remplacer par :
```tsx
eyebrow="Ma famille"
```

- [ ] **Étape 3 : Commit**

```bash
git add src/app/\(app\)/profile/lieux/page.tsx src/app/\(app\)/profile/billing/page.tsx
git commit -m "feat(profile): eyebrow Ma famille sur lieux et billing"
```

---

## Task 6 : Réécrire `ProfileSectionNav`

Deux groupes visuels séparés : "Ma famille" et "Mon compte".

**Files:**
- Modify: `src/components/layout/profile-section-nav.tsx`

- [ ] **Étape 1 : Remplacer le contenu complet de `profile-section-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const familyLinks = [
  { href: "/profile/membres", label: "Membres", exact: true },
  { href: "/profile/lieux", label: "Lieux" },
  { href: "/profile/billing", label: "Abonnement" },
];

const accountLinks = [{ href: "/profile/compte", label: "Mon compte" }];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    // Reconnaître /profile et /tablee/profile comme équivalents à /profile/membres
    if (href === "/profile/membres") {
      return (
        pathname === "/profile/membres" ||
        pathname === "/tablee/profile/membres" ||
        pathname === "/profile" ||
        pathname === "/tablee/profile"
      );
    }
    return pathname === href || pathname === `/tablee${href}`;
  }
  return pathname.startsWith(href) || pathname.startsWith(`/tablee${href}`);
}

export function ProfileSectionNav({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();

  const pillClass = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
      inverse
        ? active
          ? "border-white/20 bg-white text-primary shadow-sm"
          : "border-white/15 bg-white/10 text-white/85 hover:border-white/25 hover:bg-white/20 hover:text-white"
        : active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-primary/10 bg-primary/5 text-foreground/70 hover:border-primary/30 hover:bg-accent hover:text-foreground",
    );

  const labelClass = cn(
    "mb-1 text-[10px] font-semibold uppercase tracking-wider",
    inverse ? "text-white/45" : "text-muted-foreground",
  );

  return (
    <nav className="flex flex-wrap items-end gap-x-3 gap-y-3">
      {/* Groupe Ma famille */}
      <div>
        <p className={labelClass}>Ma famille</p>
        <div className="flex flex-wrap gap-2">
          {familyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pillClass(isActive(pathname, link.href, link.exact ?? false))}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Séparateur vertical — desktop uniquement */}
      <div
        className={cn(
          "hidden h-8 w-px self-center sm:block",
          inverse ? "bg-white/20" : "bg-border",
        )}
        aria-hidden
      />

      {/* Groupe Mon compte */}
      <div>
        <p className={labelClass}>Mon compte</p>
        <div className="flex flex-wrap gap-2">
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pillClass(isActive(pathname, link.href, link.exact ?? false))}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/layout/profile-section-nav.tsx
git commit -m "feat(profile): ProfileSectionNav deux groupes Ma famille / Mon compte"
```

---

## Task 7 : Supprimer `/profile/dietary`

**Files:**
- Delete: `src/app/(app)/profile/dietary/page.tsx`
- Delete: `src/app/(app)/profile/dietary/actions.ts`

- [ ] **Étape 1 : Supprimer les deux fichiers**

```bash
rm src/app/\(app\)/profile/dietary/page.tsx
rm src/app/\(app\)/profile/dietary/actions.ts
rmdir src/app/\(app\)/profile/dietary
```

- [ ] **Étape 2 : Commit**

```bash
git add -A src/app/\(app\)/profile/dietary/
git commit -m "feat(profile): supprimer /profile/dietary (fusionné dans /compte)"
```

---

## Task 8 : Build de validation et déploiement

- [ ] **Étape 1 : Lancer le build**

```bash
npm run build
```

Résultat attendu : build réussi, aucune erreur TypeScript ni Next.js. Vérifier en particulier :
- `/profile/membres` apparaît dans les routes générées
- `/profile/compte` apparaît dans les routes générées
- `/profile/dietary` n'apparaît plus

- [ ] **Étape 2 : Vérifier les redirections dans le navigateur**

Accéder à `http://192.168.1.150:3000/tablee/profile` → doit rediriger automatiquement vers `/tablee/profile/membres`.

- [ ] **Étape 3 : Vérifier la nav**

Sur n'importe quelle page profil : la pill active est correcte, les labels "Ma famille" et "Mon compte" sont visibles.

- [ ] **Étape 4 : Vérifier `/profile/compte`**

- Le nom d'affichage est pré-rempli
- Sauvegarder un nouveau nom → la page recharge avec le nouveau nom dans le header
- Les préférences alimentaires s'affichent si premium

- [ ] **Étape 5 : Push et déploiement**

```bash
git push origin main
ssh -o StrictHostKeyChecking=no root@192.168.1.106 "pct exec 112 -- bash -lc 'cd /opt/Tablee && git pull && npm install && npx prisma generate && npx next build && pm2 restart tablee --update-env'"
```

Vérifier que PM2 affiche `tablee` avec statut `online`.
