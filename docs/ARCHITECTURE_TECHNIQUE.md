# Architecture technique - Tablee MVP

Version: V1  
Date: 9 avril 2026  
Source: PRD V1.2, Schema BDD MVP V1

## 1. Vue d'ensemble

Tablee est une application web responsive de planification familiale de repas, recettes et courses. L'application est hebergee en self-hosted sur un homelab Proxmox.

### Stack retenue

| Couche | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Langage | TypeScript |
| Auth | NextAuth.js v5 (Auth.js) |
| ORM | Prisma |
| Base de donnees | PostgreSQL 15 (self-hosted, CT111) |
| UI | Tailwind CSS + shadcn/ui |
| API | Next.js Server Actions + Route Handlers |
| Deploiement | Homelab Proxmox |

## 2. Infrastructure

### Base de donnees

- Conteneur: CT111 `tablee-db`
- IP: `192.168.1.149`
- Port: `5432`
- Base: `tablee`
- User applicatif: `tablee_app`
- Acces: LAN uniquement (192.168.1.0/24)
- Schema: `sql/001_init_schema.sql`

### Application Next.js

- Conteneur prevu: CT112 `tablee-app` (a creer)
- IP suggeree: `192.168.1.150`
- OS: Debian 12
- Runtime: Node.js LTS (v20+)
- Port applicatif: `3000`
- Ressources suggerees: 2 vCPU, 2G RAM, 10G disque

### Acces reseau

- En local: `http://192.168.1.150:3000`
- Acces public optionnel via CT109 (reverse proxy Caddy) sur `tomy111.duckdns.org`
- La base de donnees ne doit jamais etre exposee publiquement

## 3. Structure du projet

```
tablee/
├── docs/                          # Documentation projet
├── sql/                           # Migrations SQL manuelles
├── prisma/
│   └── schema.prisma              # Schema Prisma (source de verite ORM)
├── src/
│   ├── app/                       # App Router Next.js
│   │   ├── (auth)/                # Routes publiques (login, register)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (app)/                 # Routes protegees (famille active requise)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── recipes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   ├── shopping/
│   │   │   │   └── page.tsx
│   │   │   ├── family/
│   │   │   │   ├── members/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── locations/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx         # Layout protege avec sidebar/nav
│   │   ├── onboarding/
│   │   │   └── page.tsx           # Creation/jonction premiere famille
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts   # NextAuth API route
│   │   ├── layout.tsx             # Layout racine
│   │   └── page.tsx               # Landing / redirect
│   ├── components/
│   │   ├── ui/                    # Composants shadcn/ui
│   │   ├── forms/                 # Formulaires metier
│   │   ├── layout/                # Navigation, sidebar, header
│   │   └── shared/                # Composants partages (selecteurs, etats vides)
│   ├── lib/
│   │   ├── prisma.ts              # Instance Prisma singleton
│   │   ├── auth.ts                # Config NextAuth
│   │   ├── auth-utils.ts          # Helpers session, famille active
│   │   └── utils.ts               # Utilitaires generaux
│   ├── actions/                   # Server Actions Next.js
│   │   ├── auth.ts                # Register, login
│   │   ├── families.ts            # CRUD familles, invitations
│   │   ├── locations.ts           # CRUD lieux
│   │   ├── recipes.ts             # CRUD recettes
│   │   ├── meal-plans.ts          # CRUD planning repas
│   │   └── shopping.ts            # CRUD articles courses
│   ├── types/                     # Types TypeScript partages
│   │   └── index.ts
│   └── hooks/                     # React hooks custom
│       ├── use-active-family.ts
│       └── use-active-location.ts
├── public/                        # Assets statiques
├── .env.local                     # Variables d'environnement (non commite)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── components.json                # Config shadcn/ui
```

## 4. Authentification

### NextAuth.js v5 (Auth.js)

Provider retenu: **Credentials** (email + mot de passe).

Fonctionnement:

- inscription via Server Action qui cree le `profile` en base
- mot de passe hashe avec `bcrypt`
- connexion via NextAuth Credentials provider
- session geree cote serveur via JWT ou session DB (a definir)
- middleware Next.js pour proteger les routes `(app)/`

### Session et famille active

- apres connexion, la session contient le `profile_id`
- la famille active est lue depuis `profile_preferences.active_family_id`
- chaque requete metier verifie l'appartenance via `family_members`
- un middleware ou helper serveur injecte le contexte famille active dans les Server Actions

### Flux d'onboarding

1. L'utilisateur cree un compte (email + mot de passe)
2. S'il n'a aucune famille: redirection vers `/onboarding`
3. Il cree une famille (+ premier lieu) ou rejoint via code
4. La famille devient active, redirection vers `/dashboard`

## 5. Prisma

### Approche

- Le schema SQL initial a deja ete execute manuellement (`sql/001_init_schema.sql`)
- Prisma est utilise en mode **introspection** pour generer le schema depuis la base existante
- Les migrations futures seront gerees via `prisma migrate`

### Commandes cles

```bash
# Generer le schema Prisma depuis la base existante
npx prisma db pull

# Generer le client Prisma
npx prisma generate

# Futures migrations
npx prisma migrate dev --name nom_migration
```

### Singleton Prisma

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 6. Securite et isolation des donnees

### Principe fondamental

Toutes les operations metier doivent etre scopees par `family_id`. L'isolation se fait au niveau applicatif (Server Actions / helpers).

### Regles

- chaque Server Action verifie que l'utilisateur est membre de la famille cible
- les queries Prisma incluent toujours un filtre `family_id`
- aucune donnee d'une famille ne doit fuiter vers une autre
- les FK composites en base empechent les references inter-familles

### Helper d'autorisation

Chaque Server Action commence par:

1. recuperer la session (NextAuth)
2. recuperer la famille active
3. verifier l'appartenance via `family_members`
4. executer la logique metier avec le `family_id` verifie

## 7. API et Server Actions

### Choix: Server Actions en priorite

- les mutations (create, update, delete) utilisent des **Server Actions**
- les lectures complexes utilisent des **Server Components** avec acces direct Prisma
- les Route Handlers (`/api/...`) sont reserves aux cas specifiques (webhooks, NextAuth)

### Convention de nommage

- fichier par domaine dans `src/actions/`
- chaque action est une fonction `async` exportee avec `"use server"`
- validation des inputs avec `zod`
- retour standardise: `{ success: true, data }` ou `{ success: false, error }`

## 8. Interface utilisateur

### Tailwind CSS + shadcn/ui

- shadcn/ui fournit les composants de base (Button, Input, Dialog, Select, Card, etc.)
- Tailwind gere le responsive et les styles custom
- approche mobile-first conformement au PRD

### Composants metier cles

| Composant | Usage |
|---|---|
| `FamilySwitcher` | Selecteur de famille active (header/sidebar) |
| `LocationTabs` | Onglets de lieux (page courses) |
| `WeekCalendar` | Vue semaine du calendrier repas |
| `MealSlotCard` | Carte midi/soir dans le calendrier |
| `RecipeCard` | Apercu d'une recette dans la liste |
| `ShoppingItem` | Ligne d'article avec checkbox |
| `QuickAddBar` | Barre d'ajout rapide (courses, repas) |
| `EmptyState` | Etats vides guides par page |

### Navigation

- **Mobile**: bottom navigation bar (dashboard, calendrier, recettes, courses)
- **Desktop**: sidebar laterale
- **Header**: nom famille active + `FamilySwitcher` + avatar/deconnexion

## 9. Variables d'environnement

```env
# .env.local (ne pas commiter)

# Base de donnees
DATABASE_URL="postgresql://tablee_app:yuROVEZcKcvB8NEvmLhqu8lVNgUhZh@192.168.1.149:5432/tablee"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generer avec openssl rand -base64 32>"
```

## 10. Ordre de developpement

Conformement au backlog MVP, les vagues de dev sont:

### Vague 1 - Fondations

- initialiser le projet Next.js + Prisma + NextAuth + Tailwind + shadcn/ui
- introspection Prisma depuis la base existante
- auth: inscription, connexion, deconnexion
- layout principal avec navigation responsive
- etats de chargement, erreur, vide

### Vague 2 - Familles et lieux

- creation de famille + onboarding
- rejoindre via code d'invitation
- selecteur de famille active
- liste des membres
- CRUD lieux

### Vague 3 - Recettes

- CRUD recettes avec ingredients et etapes structures
- consultation detail
- recherche par nom

### Vague 4 - Planning repas

- vue calendrier semaine
- CRUD repas planifie (date, midi/soir, lieu, responsable, recette)
- filtre par lieu

### Vague 5 - Courses

- liste de courses par lieu avec onglets
- ajout manuel d'articles
- ajout des ingredients depuis une recette
- checkbox achete/non achete

### Vague 6 - Dashboard et finition

- tableau de bord famille active
- raccourcis d'action rapide
- responsive final
- etats vides guides

## 11. Decisions techniques importantes

| Decision | Choix | Raison |
|---|---|---|
| App Router vs Pages Router | App Router | Standard moderne Next.js, Server Components natifs |
| Session NextAuth | JWT | Plus simple en self-hosted, pas de table session supplementaire |
| Prisma: migration vs introspection | Introspection initiale, puis migrations | Le schema SQL existe deja, on part de la base reelle |
| Server Actions vs API REST | Server Actions | Moins de boilerplate, typage naturel, colocalisation |
| Validation | Zod | Standard avec NextAuth et Server Actions |
| Hash mot de passe | bcrypt | Robuste, bien supporte par l'ecosysteme Node.js |

## 12. Points d'attention

- **Performance mobile**: le PRD insiste sur l'usage a une main, chaque action frequente doit etre realisable en peu d'etapes
- **Isolation donnees**: ne jamais faire confiance au client pour le `family_id`, toujours re-verifier cote serveur
- **Snapshot titre repas**: quand un repas est lie a une recette, stocker aussi le titre dans `meal_plans.title` pour survivre a une suppression de recette
- **Quantites non standard**: utiliser `raw_quantity_text` pour les cas comme "une pincee", "au gout"
- **Invitations**: stocker uniquement le hash du code, jamais le code en clair en base
