# Tablee

Tablee est une application familiale en français pour organiser les repas, les recettes, les courses et les membres d'une famille.

## Stack

- Next.js 16 App Router
- TypeScript
- Prisma + PostgreSQL
- Auth.js / NextAuth (credentials + Google)
- Tailwind CSS
- Import IA de recettes via Gemini ou OpenAI, avec `yt-dlp` et `ffmpeg`
- Stripe pour l'abonnement Premium famille

## Démarrage local

1. Copier `.env.example` vers `.env` et renseigner les variables utiles.
2. Générer le client Prisma :

```bash
npx prisma generate
```

3. Lancer l'application :

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run test
npm run build
```

## Base de données

- Le schéma ORM de référence est `prisma/schema.prisma`.
- Les scripts `sql/*.sql` servent au bootstrap et à la compatibilité homelab.
- Si tu pars d'une base vierge, exécute `001_init_schema.sql`, puis `002_add_auth_fields.sql`, puis `003_security_hardening.sql`, puis `004_billing.sql`.
- En production existante, le code applique aussi un garde-fou de compatibilité au runtime pour les tables critiques (`oauth_accounts`, rate limiting, jobs d'import IA).

## Variables d'environnement importantes

### Auth

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

### Import IA

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `AI_RECIPE_IMPORT_PROVIDER=gemini|openai`
- `YT_DLP_BIN`
- `FFMPEG_BIN`

### Billing Stripe

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PREMIUM_SMALL_MONTHLY`
- `STRIPE_PRICE_ID_PREMIUM_LARGE_MONTHLY`

### Garde-fous sécurité / coûts

- `AUTH_LOGIN_IP_LIMIT`
- `AUTH_LOGIN_EMAIL_LIMIT`
- `AUTH_REGISTER_IP_LIMIT`
- `AUTH_REGISTER_EMAIL_LIMIT`
- `FAMILY_CREATE_PROFILE_LIMIT`
- `FAMILY_CREATE_IP_LIMIT`
- `FAMILY_JOIN_PROFILE_LIMIT`
- `FAMILY_JOIN_IP_LIMIT`
- `FAMILY_INVITE_PROFILE_LIMIT`
- `FAMILY_INVITE_FAMILY_LIMIT`
- `FAMILY_INVITE_IP_LIMIT`
- `AI_RECIPE_IMPORT_MAX_CONCURRENT_PER_FAMILY`
- `AI_RECIPE_IMPORT_MAX_DURATION_SECONDS`
- `AI_RECIPE_IMPORT_MAX_FILE_SIZE_MB`
- `AI_RECIPE_IMPORT_DOWNLOAD_TIMEOUT_MS`
- `AI_RECIPE_IMPORT_MEDIA_TIMEOUT_MS`
- `AI_RECIPE_IMPORT_ANALYSIS_TIMEOUT_MS`

## Abonnement Premium famille

- Facturation mensuelle Stripe au niveau de la famille.
- `1 à 4 membres actifs` : `6,99 € / mois`
- `5 membres actifs ou plus` : `8,99 € / mois`
- Essai gratuit : `7 jours` avec carte requise.
- Quotas IA :
  - Free : `5 imports / 30 jours glissants / famille`
  - Premium : `10 imports / 24h glissantes / famille`
  - Premium : `50 imports / 30 jours glissants / famille`
- Garde-fou anti-abus caché : `15 imports / 24h / profil`
- Seuls les admins peuvent ouvrir Stripe Checkout ou le Customer Portal.
- Si la taille de la famille change, le nouveau prix est programmé pour le cycle suivant, sans prorata.

## Configuration Stripe

1. Créer un produit `Premium Famille` dans Stripe.
2. Créer deux prix mensuels :
   - `6,99 €` pour `1 à 4 membres`
   - `8,99 €` pour `5+ membres`
3. Renseigner les deux `price_id` dans `.env`.
4. Configurer un webhook Stripe vers :

```text
https://votre-domaine/tablee/api/stripe/webhook
```

5. Abonner les événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

## Déploiement homelab

Le déploiement passe via l'hôte Proxmox, puis `pct exec 112`.

```powershell
ssh -o StrictHostKeyChecking=no root@192.168.1.106 "pct exec 112 -- bash -lc 'cd /opt/Tablee && git pull && npm install && npx prisma generate && npx next build && pm2 restart tablee --update-env'"
```

## Dépendances système pour l'import IA

Le conteneur applicatif doit avoir :

- `yt-dlp`
- `ffmpeg`

Sans eux, l'import IA refusera proprement les liens sociaux.

## Points de vigilance

- Les médias de recettes passent par des routes authentifiées et scoped à la famille.
- Le rate limiting est stocké en Postgres, donc il fonctionne sans Redis.
- L'import IA est maintenant tracé dans `recipe_import_jobs`, avec quotas et limites de concurrence.
- Le billing famille repose sur Stripe + `family_subscriptions` + `billing_webhook_events`.
