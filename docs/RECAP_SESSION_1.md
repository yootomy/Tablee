# Récap Session 1 — 9 avril 2026

## Infrastructure

### CT111 `tablee-db` créé sur Proxmox

- **IP** : `192.168.1.149`
- **OS** : Debian 12
- **Ressources** : 2 vCPU, 2 Go RAM, 16 Go disque (local-lvm)
- **PostgreSQL** : 15.16
- **Base** : `tablee`
- **User applicatif** : `tablee_app`
- **Mot de passe** : `yuROVEZcKcvB8NEvmLhqu8lVNgUhZh`
- **Accès LAN** : `listen_addresses = '*'`, pg_hba pour `192.168.1.0/24`
- **Connection string** : `postgresql://tablee_app:yuROVEZcKcvB8NEvmLhqu8lVNgUhZh@192.168.1.149:5432/tablee`

### Schéma BDD exécuté

- **`sql/001_init_schema.sql`** : 13 tables, 3 enums, 12 index, 8 triggers `updated_at`, grants
- **`sql/002_add_auth_fields.sql`** : ajout `email` et `password_hash` sur `profiles` + index unique sur `lower(email)` + `id` auto-généré avec `gen_random_uuid()`

### Tables créées

| Table | Rôle |
|---|---|
| `profiles` | Comptes utilisateurs |
| `profile_preferences` | Famille active par utilisateur |
| `families` | Espaces familiaux |
| `family_members` | Liens utilisateur-famille + rôles |
| `family_invites` | Codes d'invitation hashés |
| `family_context_preferences` | Dernier lieu sélectionné par famille |
| `locations` | Lieux de vie |
| `recipes` | Recettes |
| `recipe_ingredients` | Ingrédients structurés |
| `recipe_steps` | Étapes ordonnées |
| `meal_plans` | Planning repas |
| `shopping_items` | Articles de courses par lieu |
| `activity_logs` | Journal (optionnel, phase 2) |

## Documentation produite

| Document | Contenu |
|---|---|
| `docs/PRD-app-familiale-recettes.md` | Product Requirements Document V1.2 (lu, pas modifié) |
| `docs/BACKLOG_MVP-app-familiale-recettes.md` | Backlog MVP 37 stories en 6 vagues (lu, pas modifié) |
| `docs/SCHEMA_BDD_MVP-app-familiale-recettes.md` | Schéma BDD PostgreSQL (lu, pas modifié) |
| `docs/CLAUDE_HOMELAB_BRIEFING.md` | Briefing homelab Proxmox (lu, pas modifié) |
| `docs/ARCHITECTURE_TECHNIQUE.md` | **Créé** — Stack, structure projet, auth, sécurité, ordre de dev |

## Stack technique retenue

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript |
| Auth | NextAuth.js v5 beta (Credentials, JWT) |
| ORM | Prisma 7.7 avec `@prisma/adapter-pg` |
| Base de données | PostgreSQL 15 (self-hosted, CT111) |
| UI | Tailwind CSS v4 + shadcn/ui v4 (base-ui) |
| API | Server Actions + Route Handlers |
| Validation | Zod |
| Hash mots de passe | bcryptjs |

## Projet Next.js initialisé

Prisma introspection réussie depuis la base existante (13 modèles générés). Build propre.

## Vague 1 du backlog — Complétée

### MVP-001 — Initialiser l'application web responsive

- Shell de l'application créé
- Routing en place pour toutes les pages principales
- Navigation responsive (sidebar desktop, bottom nav mobile)
- Redirection vers `/login` pour les utilisateurs non connectés (`src/proxy.ts`)

### MVP-002 — Créer un compte utilisateur

- Page `/register` avec formulaire (prénom, email, mot de passe)
- Server Action `register` dans `src/actions/auth.ts`
- Validation Zod (email valide, mot de passe min 8 caractères, prénom min 2)
- Hash bcrypt (12 rounds)
- Vérification de doublon email
- Auto-connexion après inscription

### MVP-003 — Se connecter et se déconnecter

- Page `/login` avec formulaire (email, mot de passe)
- Connexion via `signIn("credentials")` de NextAuth
- Session JWT persistante
- Déconnexion via `UserMenu` (composant dropdown)
- Routes protégées via `src/proxy.ts` (vérifie le cookie de session)

### MVP-004 — Gérer les états standards

- `src/components/shared/loading.tsx` — squelette de chargement (skeletons)
- `src/components/shared/empty-state.tsx` — état vide avec titre, description et action
- `src/components/shared/error-message.tsx` — message d'erreur stylisé
- `src/app/(app)/dashboard/loading.tsx` — loading state du dashboard

### MVP-005 — Créer une première famille

- Page `/onboarding` pour les utilisateurs sans famille
- Formulaire : nom de la famille + nom du premier lieu
- Server Action `createFamily` dans `src/actions/families.ts`
- Transaction Prisma : crée la famille, le membership admin, le lieu, et set la famille active
- Redirection automatique vers `/dashboard` après création

### MVP-008 — Changer de famille active

- Composant `FamilySwitcher` dans `src/components/layout/family-switcher.tsx`
- Dropdown avec liste des familles de l'utilisateur + indicateur "actif"
- Server Action `switchFamily` dans `src/actions/families.ts`
- Vérifie le membership avant de changer
- Présent dans la sidebar (desktop) et le header (mobile)

### MVP-035 — Isoler strictement les données par famille

- Helper `requireActiveFamily()` dans `src/lib/auth-utils.ts`
- Vérifie la session, récupère la famille active, vérifie le membership
- Toutes les queries dashboard scopées par `family_id`
- Le layout `(app)` redirige vers `/onboarding` si pas de famille
- Le layout `(app)` auto-set la première famille si aucune active

## Fichiers créés

### Configuration

- `prisma/schema.prisma` — schéma Prisma (13 modèles introspectés)
- `prisma.config.ts` — config Prisma
- `.env` — variables d'environnement (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)
- `next.config.ts` — config Next.js (workerThreads activé)
- `components.json` — config shadcn/ui

### Lib

- `src/lib/prisma.ts` — singleton Prisma avec adapter-pg
- `src/lib/auth.ts` — config NextAuth v5 (Credentials provider, JWT callbacks)
- `src/lib/auth-utils.ts` — helpers requireAuth, requireActiveFamily
- `src/lib/utils.ts` — utilitaire cn() (shadcn)

### Server Actions

- `src/actions/auth.ts` — register
- `src/actions/families.ts` — createFamily, switchFamily, getUserFamilies

### Pages

- `src/app/page.tsx` — redirect vers /dashboard ou /login
- `src/app/layout.tsx` — layout racine avec Providers et Toaster
- `src/app/(auth)/layout.tsx` — layout centré pour auth
- `src/app/(auth)/login/page.tsx` — page connexion
- `src/app/(auth)/register/page.tsx` — page inscription
- `src/app/onboarding/page.tsx` — création première famille
- `src/app/(app)/layout.tsx` — layout protégé avec sidebar, header, BottomNav
- `src/app/(app)/dashboard/page.tsx` — tableau de bord famille
- `src/app/(app)/dashboard/loading.tsx` — état de chargement

### Composants

- `src/components/providers.tsx` — SessionProvider NextAuth
- `src/components/layout/family-switcher.tsx` — sélecteur de famille active
- `src/components/layout/nav-links.tsx` — NavLinks (sidebar) + BottomNav (mobile)
- `src/components/layout/user-menu.tsx` — avatar + dropdown déconnexion
- `src/components/shared/loading.tsx` — PageLoading (skeletons)
- `src/components/shared/empty-state.tsx` — EmptyState
- `src/components/shared/error-message.tsx` — ErrorMessage
- `src/components/ui/` — button, input, label, card, separator, skeleton, dropdown-menu, avatar, sonner

### Types

- `src/types/next-auth.d.ts` — augmentation du type Session

### Proxy (auth guard)

- `src/proxy.ts` — remplace middleware.ts (déprécié en Next 16)

## Points techniques notables

- **shadcn/ui v4** utilise `@base-ui/react`, pas Radix. La prop `asChild` n'existe plus. Utiliser `buttonVariants()` avec `className` pour les liens-boutons.
- **Prisma 7.x** requiert un driver adapter (`@prisma/adapter-pg`). Le constructeur `new PrismaClient()` sans argument ne fonctionne plus.
- **Next.js 16** déprécie `middleware.ts` au profit de `proxy.ts`.
- **`next.config.ts`** a `experimental.workerThreads: true` pour contourner un bug `spawn EPERM` sur Windows.

## Prochaine étape

**Vague 2** du backlog :
- MVP-006 — Rejoindre une famille via code d'invitation
- MVP-007 — Créer une famille supplémentaire
- MVP-009 — Lister les membres d'une famille
- MVP-010 — Inviter un membre à une famille
- MVP-012 — Créer un lieu
- MVP-013 — Modifier un lieu
