# Schema BDD MVP - Application familiale de recettes, planning repas et courses

Version: V1 brouillon  
Date: 9 avril 2026  
Base cible: PostgreSQL compatible Supabase

## 1. Objectif

Ce document definit le schema de base de donnees MVP pour l'application.

Il doit couvrir:

- multi-familles
- famille active
- membres et roles
- lieux
- recettes
- ingredients et etapes
- planning repas
- liste de courses par lieu
- securite minimale des invitations

## 2. Hypotheses techniques

Hypotheses retenues:

- base de donnees relationnelle PostgreSQL
- authentification geree par Supabase Auth ou equivalent
- identifiants en `uuid`
- dates/horodatages en `timestamptz`
- toutes les donnees metier sont rattachees a une famille
- les donnees doivent etre isolees entre familles

Si tu utilises Supabase:

- `auth.users` contient les comptes auth
- une table `profiles` contient les donnees applicatives utilisateur

## 3. Principes de modelisation

Principes structurants:

- un utilisateur peut appartenir a plusieurs familles
- l'application fonctionne toujours dans le contexte d'une famille active
- les tables metier principales embarquent `family_id`
- on privilegie les `FK composites` quand cela permet d'empecher les references inter-familles
- les lieux sont archives plutot que supprimes
- les recettes peuvent etre archivees ou supprimees
- un repas peut avoir un responsable, mais ce champ est optionnel
- la liste de courses est toujours scopee par lieu

## 4. Enums recommandes

### `family_role`

- `admin`
- `member`

### `meal_slot`

- `lunch`
- `dinner`

### `meal_plan_status`

- `planned`
- `done`
- `canceled`

## 5. Tables principales

## 5.1 `profiles`

Role:

- informations applicatives de l'utilisateur connecte

Colonnes:

- `id uuid primary key`
  reference `auth.users(id)` si Supabase
- `display_name text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `display_name` obligatoire

Notes:

- une ligne `profiles` est creee lors de la creation du compte auth

## 5.2 `profile_preferences`

Role:

- stocker les preferences globales du profil

Colonnes:

- `profile_id uuid primary key`
  reference `profiles(id) on delete cascade`
- `active_family_id uuid null`
  reference `families(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- `active_family_id` doit correspondre a une famille dont l'utilisateur est membre
- cette regle peut etre enforcee via service layer ou trigger SQL

## 5.3 `families`

Role:

- espace de collaboration principal

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `created_by_profile_id uuid not null`
  reference `profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `name` obligatoire

## 5.4 `family_members`

Role:

- lien entre un profil et une famille

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `profile_id uuid not null`
  reference `profiles(id) on delete cascade`
- `role family_role not null default 'member'`
- `invited_by_profile_id uuid null`
  reference `profiles(id) on delete set null`
- `joined_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Contraintes:

- `unique (family_id, profile_id)`

Notes:

- cette table est critique pour la securite d'acces

## 5.5 `family_invites`

Role:

- invitations par code securise

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `created_by_profile_id uuid not null`
  reference `profiles(id) on delete restrict`
- `role_to_grant family_role not null default 'member'`
- `code_hash text not null`
- `code_last4 text not null`
- `max_uses integer not null default 1`
- `uses_count integer not null default 0`
- `expires_at timestamptz null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null default now()`

Contraintes:

- `unique (code_hash)`
- `max_uses >= 1`
- `uses_count >= 0`

Choix recommande:

- generer un code aleatoire cote backend
- stocker uniquement `code_hash`
- afficher le code a l'admin au moment de la creation
- si le code est perdu, l'admin en regenere un nouveau

## 5.6 `family_context_preferences`

Role:

- preferences d'un utilisateur dans une famille donnee

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `profile_id uuid not null`
  reference `profiles(id) on delete cascade`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `last_selected_location_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `unique (profile_id, family_id)`

Notes:

- `last_selected_location_id` doit pointer vers un lieu de la meme famille
- cette regle peut etre enforcee via trigger ou service layer

## 5.7 `locations`

Role:

- lieux de vie ou de cuisine d'une famille

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `name text not null`
- `archived_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `unique (family_id, id)`

Choix recommande:

- ajouter un index unique partiel sur `lower(name)` par famille pour les lieux non archives

## 5.8 `recipes`

Role:

- recette partagee au sein d'une famille

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `created_by_profile_id uuid not null`
- `updated_by_profile_id uuid null`
- `title text not null`
- `description text null`
- `prep_time_minutes integer null`
- `cook_time_minutes integer null`
- `servings integer null`
- `source_url text null`
- `archived_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `unique (family_id, id)`
- `prep_time_minutes >= 0`
- `cook_time_minutes >= 0`
- `servings > 0` si renseigne
- `foreign key (family_id, created_by_profile_id) references family_members(family_id, profile_id)`
- `foreign key (family_id, updated_by_profile_id) references family_members(family_id, profile_id)`

Notes:

- suppression autorisee
- en cas de suppression, les repas historiques gardent leur titre snapshot

## 5.9 `recipe_ingredients`

Role:

- ingredients structures d'une recette

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `recipe_id uuid not null`
  reference `recipes(id) on delete cascade`
- `position integer not null`
- `name text not null`
- `quantity_numeric numeric(10,2) null`
- `unit text null`
- `raw_quantity_text text null`
- `note text null`
- `created_at timestamptz not null default now()`

Contraintes:

- `unique (recipe_id, position)`
- `quantity_numeric >= 0` si renseigne

Notes:

- `raw_quantity_text` permet de garder des cas du type `une pincee`, `1/2`, `au gout`

## 5.10 `recipe_steps`

Role:

- etapes ordonnees d'une recette

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `recipe_id uuid not null`
  reference `recipes(id) on delete cascade`
- `position integer not null`
- `instruction text not null`
- `created_at timestamptz not null default now()`

Contraintes:

- `unique (recipe_id, position)`

## 5.11 `meal_plans`

Role:

- repas planifies dans le calendrier

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `recipe_id uuid null`
- `location_id uuid not null`
- `responsible_profile_id uuid null`
- `meal_date date not null`
- `meal_slot meal_slot not null`
- `status meal_plan_status not null default 'planned'`
- `title text not null`
- `notes text null`
- `created_by_profile_id uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `unique (family_id, id)`
- `foreign key (family_id, location_id) references locations(family_id, id) on delete restrict`
- `foreign key (family_id, responsible_profile_id) references family_members(family_id, profile_id) on delete set null`
- `foreign key (family_id, created_by_profile_id) references family_members(family_id, profile_id) on delete restrict`
- `foreign key (family_id, recipe_id) references recipes(family_id, id) on delete set null`

Choix recommande:

- stocker `title` meme si `recipe_id` est renseigne
- cela permet de garder un snapshot du nom du repas si la recette change ou disparait

## 5.12 `shopping_items`

Role:

- articles de courses d'un lieu donne

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `location_id uuid not null`
- `name text not null`
- `quantity_numeric numeric(10,2) null`
- `unit text null`
- `raw_quantity_text text null`
- `comment text null`
- `is_completed boolean not null default false`
- `created_by_profile_id uuid not null`
- `completed_by_profile_id uuid null`
- `completed_at timestamptz null`
- `source_recipe_id uuid null`
- `source_meal_plan_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contraintes:

- `foreign key (family_id, location_id) references locations(family_id, id) on delete restrict`
- `foreign key (family_id, created_by_profile_id) references family_members(family_id, profile_id) on delete restrict`
- `foreign key (family_id, completed_by_profile_id) references family_members(family_id, profile_id) on delete set null`
- `foreign key (family_id, source_recipe_id) references recipes(family_id, id) on delete set null`
- `foreign key (family_id, source_meal_plan_id) references meal_plans(family_id, id) on delete set null`
- `quantity_numeric >= 0` si renseigne

Notes:

- `raw_quantity_text` est utile pour des cas non standard
- le MVP n'impose pas de dedoublonnage intelligent

## 5.13 `activity_logs`

Role:

- journal applicatif minimal pour phase 2

Colonnes:

- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null`
  reference `families(id) on delete cascade`
- `actor_profile_id uuid null`
- `entity_type text not null`
- `entity_id uuid null`
- `action text not null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Statut:

- optionnel
- non requis pour le MVP strict

## 6. Relations resumees

- un `profile` peut appartenir a plusieurs `families`
- une `family` a plusieurs `family_members`
- une `family` a plusieurs `locations`
- une `family` a plusieurs `recipes`
- une `recipe` a plusieurs `recipe_ingredients`
- une `recipe` a plusieurs `recipe_steps`
- une `family` a plusieurs `meal_plans`
- une `family` a plusieurs `shopping_items`
- un `meal_plan` peut pointer vers une `recipe`
- un `shopping_item` peut provenir d'une `recipe` ou d'un `meal_plan`

## 7. Regles de suppression et archivage

Regles recommandees:

- `locations`: archivage au lieu de suppression dans le flux normal
- `recipes`: archivage possible, suppression definitive autorisee
- `meal_plans`: suppression simple autorisee
- `shopping_items`: suppression simple autorisee
- `family_members`: suppression de la relation d'appartenance si le membre quitte la famille

Effets importants:

- si une recette est supprimee, `meal_plans.recipe_id` passe a `null`
- si une recette est supprimee, `shopping_items.source_recipe_id` passe a `null`
- si un lieu est encore reference, la suppression physique doit etre bloquee

## 8. Index recommandes

Index minimaux recommandes:

- `family_members (family_id, profile_id)` unique
- `family_members (profile_id)`
- `family_invites (code_hash)` unique
- `locations (family_id, archived_at)`
- `recipes (family_id, archived_at, created_at desc)`
- `recipes (family_id, title)`
- `recipe_ingredients (recipe_id, position)`
- `recipe_steps (recipe_id, position)`
- `meal_plans (family_id, meal_date, meal_slot)`
- `meal_plans (family_id, location_id, meal_date)`
- `shopping_items (family_id, location_id, is_completed, created_at desc)`
- `shopping_items (family_id, source_recipe_id)`

Index optionnels utiles plus tard:

- trigram sur `recipes.title`
- trigram sur `shopping_items.name`

## 9. RLS / securite recommandees

Si tu utilises Supabase, le minimum recommande est:

- un utilisateur peut lire un `profile` si `profile.id = auth.uid()`
- un utilisateur peut lire une `family` si une ligne existe dans `family_members`
- un utilisateur peut lire et modifier les donnees d'une famille seulement s'il en est membre
- seules certaines actions sensibles peuvent etre limitees aux `admin`

Exemples de regles:

- `family_invites`: lecture/ecriture reservee aux admins de la famille
- `family_members`: lecture pour tous les membres, suppression reservee aux admins
- `locations`, `recipes`, `meal_plans`, `shopping_items`: lecture/ecriture pour les membres de la famille

Point critique:

- toute policy doit toujours repasser par `family_members`

## 10. Ordre de creation SQL recommande

Ordre conseille:

1. enums
2. `profiles`
3. `families`
4. `profile_preferences`
5. `family_members`
6. `family_invites`
7. `family_context_preferences`
8. `locations`
9. `recipes`
10. `recipe_ingredients`
11. `recipe_steps`
12. `meal_plans`
13. `shopping_items`
14. `activity_logs`
15. indexes
16. triggers `updated_at`
17. policies RLS

## 11. Choix structurants importants

Les choix les plus importants de ce schema sont:

- `multi-familles` des le debut
- `family_id` partout sur les tables metier
- `FK composites` pour eviter les references d'une famille vers une autre
- `title snapshot` sur `meal_plans`
- `raw_quantity_text` pour rester realiste sur les ingredients et les courses
- `code_hash` pour des invitations plus sures

## 12. Prochaine etape recommandee

La meilleure suite est de transformer ce schema en:

1. SQL de creation initiale
2. schema d'API ou contrats backend
3. tickets techniques de la Vague 1
