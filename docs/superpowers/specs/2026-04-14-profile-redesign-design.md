# Refonte section Profil — Design

**Date :** 2026-04-14
**Statut :** Validé — prêt pour implémentation

## Contexte

La section `/profile` regroupe actuellement quatre sous-pages dans une navigation plate : Membres, Lieux, Abonnement, Alimentaire. L'ajout de la feature alimentaire (2026-04-14) a créé une incohérence : des préférences personnelles (dietary) se retrouvent au même niveau que la gestion familiale et la facturation. Cette refonte clarifie la hiérarchie en deux sections distinctes.

## Objectif

Réorganiser `/profile` en deux sections sémantiquement distinctes — **Ma famille** (gestion collective) et **Mon compte** (préférences personnelles) — tout en ajoutant la possibilité de changer son nom d'affichage.

---

## 1. Structure des URLs

| URL | Contenu | Changement |
|-----|---------|------------|
| `/profile` | Redirect → `/profile/membres` | Modifié |
| `/profile/membres` | Membres + invitations | Renommé (était `/profile`) |
| `/profile/lieux` | Lieux de la famille | Inchangé |
| `/profile/billing` | Abonnement Premium | Inchangé |
| `/profile/compte` | Nom d'affichage + alimentaire | **Nouveau** |
| `/profile/dietary` | — | **Supprimé** (fusionné dans `/compte`) |

La page actuelle `src/app/(app)/profile/page.tsx` devient une page de redirection. Son contenu (membres + invitations) déménage dans `src/app/(app)/profile/membres/page.tsx`.

## 2. Navigation — `ProfileSectionNav`

### Comportement actuel
4 pills identiques en rangée plate dans le header.

### Nouveau comportement
Deux groupes visuellement distincts, séparés par un trait vertical (`|`) sur desktop et une marge plus large sur mobile :

```
[ Membres  Lieux  Abonnement ]  |  [ Mon compte ]
  ←─── Ma famille ───────────       ─────────────→
```

**Desktop :** un libellé discret (`Ma famille` / `Mon compte`) au-dessus de chaque groupe de pills.

**Mobile :** les groupes s'empilent sur deux lignes, le séparateur vertical est remplacé par un espacement `gap` plus large entre les deux groupes.

**Style actuel conservé :** pill active = fond blanc, texte primary. Pill inactive = fond blanc/10, texte blanc/85.

### Fichier concerné
`src/components/layout/profile-section-nav.tsx`

### Liens mis à jour
```ts
const familyLinks = [
  { href: "/profile/membres", label: "Membres", exact: true },
  { href: "/profile/lieux", label: "Lieux" },
  { href: "/profile/billing", label: "Abonnement" },
];

const accountLinks = [
  { href: "/profile/compte", label: "Mon compte" },
];
```

La détection de l'état actif sur `/profile/membres` doit reconnaître `/profile` et `/tablee/profile` comme équivalents (basePath).

## 3. Page `/profile/membres`

Contenu identique à l'actuelle `src/app/(app)/profile/page.tsx` :
- Liste des membres triés (admins en premier, puis alphabétique)
- Sidebar admin : formulaire invitation + liste des invitations actives
- `RemoveFamilyMemberButton` pour les non-admins

**En-tête :**
- `eyebrow="Ma famille"`
- `title={family.name}`
- Badges : nb membres + rôle + nb invitations actives

## 4. Pages existantes — mises à jour mineures

Les pages `/profile/lieux` et `/profile/billing` ne changent pas fonctionnellement. Seul le `eyebrow` est mis à jour :

```tsx
// Avant
eyebrow="Mon profil"

// Après
eyebrow="Ma famille"
```

## 5. Page `/profile/compte` — Nouvelle page

### En-tête
- `eyebrow="Mon compte"`
- `title={displayName}` (nom d'affichage de l'utilisateur connecté)
- Pas de badges

### Bloc 1 — Nom d'affichage
Card simple avec :
- Champ texte (`<Input>`) pré-rempli avec `profiles.display_name` actuel
- Bouton "Sauvegarder"
- Server Action `updateDisplayName` : met à jour `profiles.display_name`
- Validation : min 2 caractères, max 50 caractères
- Après sauvegarde : `revalidatePath("/profile/compte")`

### Bloc 2 — Préférences alimentaires
Contenu identique à l'actuelle `src/app/(app)/profile/dietary/page.tsx` :
- Premium-gated (EmptyState + CTA si free)
- Checkboxes régimes + allergènes
- Server Action `saveDietaryPreferences` (déjà existante dans `dietary/actions.ts`, à déplacer ou réexporter)

### Layout
Colonne unique — pas de sidebar. Les deux blocs s'empilent verticalement. Identique sur mobile et desktop.

## 6. Page `/profile` — Redirection

`src/app/(app)/profile/page.tsx` devient :

```tsx
import { redirect } from "next/navigation";
export default function ProfilePage() {
  redirect("/profile/membres");
}
```

## 7. Page `/profile/dietary` — Suppression

Le fichier `src/app/(app)/profile/dietary/page.tsx` est supprimé.
Le fichier `src/app/(app)/profile/dietary/actions.ts` (`saveDietaryPreferences`) est déplacé vers `src/app/(app)/profile/compte/actions.ts`. Le `revalidatePath` est mis à jour de `"/profile/dietary"` vers `"/profile/compte"`.

## 8. Server Action — `updateDisplayName`

Nouvelle action à créer dans `src/app/(app)/profile/compte/actions.ts` (même fichier que `saveDietaryPreferences`) :

```ts
export async function updateDisplayName(formData: FormData): Promise<void> {
  const { profileId } = await requireActiveFamily();
  const displayName = formData.get("displayName");
  if (typeof displayName !== "string" || displayName.trim().length < 2 || displayName.trim().length > 50) {
    throw new Error("Le nom doit faire entre 2 et 50 caractères.");
  }
  await prisma.profiles.update({
    where: { id: profileId },
    data: { display_name: displayName.trim() },
  });
  revalidatePath("/profile/compte");
}
```

## 9. Fichiers à créer / modifier / supprimer

| Action | Fichier |
|--------|---------|
| Modifier | `src/components/layout/profile-section-nav.tsx` |
| Modifier → redirect | `src/app/(app)/profile/page.tsx` |
| Créer | `src/app/(app)/profile/membres/page.tsx` |
| Modifier (eyebrow) | `src/app/(app)/profile/lieux/page.tsx` |
| Modifier (eyebrow) | `src/app/(app)/profile/billing/page.tsx` |
| Créer | `src/app/(app)/profile/compte/page.tsx` |
| Créer | `src/app/(app)/profile/compte/actions.ts` |
| Supprimer | `src/app/(app)/profile/dietary/page.tsx` |
| Déplacer/adapter | `src/app/(app)/profile/dietary/actions.ts` |

## 10. Contraintes et points d'attention

- **basePath `/tablee`** : tous les `href` dans `ProfileSectionNav` sont relatifs — Next.js gère le basePath automatiquement pour `<Link>`. La détection d'état actif (`pathname`) doit vérifier `/profile/membres` ET `/tablee/profile/membres`.
- **Redirect `requireActiveFamily`** : vérifier que la page `/profile/membres` hérite bien de la même logique d'auth que l'actuelle `/profile`.
- **`saveDietaryPreferences`** : l'action existante utilise `revalidatePath("/profile/dietary")` — à mettre à jour vers `revalidatePath("/profile/compte")` après déplacement.
- **UserMenu** : vérifier que le lien vers le profil dans le UserMenu pointe vers `/profile` (la redirection s'occupera du reste).
