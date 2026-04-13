# Tablee

Tablee est une application familiale en français pour organiser les repas, les recettes, les courses et les membres d'une famille.

## Stack

- Next.js 16 App Router
- TypeScript
- Prisma + PostgreSQL
- Auth.js / NextAuth (credentials + Google)
- Tailwind CSS
- Import IA de recettes via Gemini ou OpenAI, avec `yt-dlp` et `ffmpeg`

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
- Si tu pars d'une base vierge, exécute `001_init_schema.sql`, puis `002_add_auth_fields.sql`, puis `003_security_hardening.sql`.
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
- `AI_RECIPE_IMPORT_PROFILE_DAILY_LIMIT`
- `AI_RECIPE_IMPORT_FAMILY_DAILY_LIMIT`
- `AI_RECIPE_IMPORT_MAX_CONCURRENT_PER_FAMILY`
- `AI_RECIPE_IMPORT_MAX_DURATION_SECONDS`
- `AI_RECIPE_IMPORT_MAX_FILE_SIZE_MB`
- `AI_RECIPE_IMPORT_DOWNLOAD_TIMEOUT_MS`
- `AI_RECIPE_IMPORT_MEDIA_TIMEOUT_MS`
- `AI_RECIPE_IMPORT_ANALYSIS_TIMEOUT_MS`

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
