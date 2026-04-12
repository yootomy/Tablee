@AGENTS.md

# Tablee Context

## Project summary

- Tablee is a family meal-planning app in French.
- Core product areas:
  - `Repas` / calendar planning
  - `Recettes`
  - `Courses`
  - `Famille` (members, invites, locations)
- The app is self-hosted on the user's homelab and published under:
  - local: `http://192.168.1.150:3000`
  - public: `https://tomy111.duckdns.org/tablee`

## Stack

- Next.js 16 App Router
- TypeScript
- Prisma
- PostgreSQL
- Auth.js / NextAuth credentials auth
- Tailwind CSS
- local UI wrappers in `src/components/ui/*`

## Design / UI rules

- The dashboard is the main visual reference for the rest of the app.
- Prefer these shared components instead of page-specific one-off patterns:
  - `AppPageHeader`
  - `FormSection`
  - `EmptyState`
- Product font is `Nunito`.
- Keep the green palette already defined in `src/app/globals.css`.
- Avoid introducing accent colors outside the green family unless explicitly requested.
- Mobile UX matters a lot:
  - keep inputs touch-friendly
  - respect safe areas
  - avoid iOS auto-zoom regressions

## Current product conventions

- Active family is stored in `profile_preferences.active_family_id`.
- Per-family user context is stored in `family_context_preferences`.
- `family_context_preferences.last_selected_location_id` is used as the preferred/default location.
- When a page or action needs a default location, it should use the preferred location if available.
- Shared helper for that logic:
  - `src/lib/location-preferences.ts`
- AI recipe import lives in `src/lib/recipe-import.ts`.
- If both keys exist, the social import should prefer Gemini automatically.
- Relevant env vars:
  - `GEMINI_API_KEY`
  - `OPENAI_API_KEY`
  - optional `AI_RECIPE_IMPORT_PROVIDER=gemini|openai`

## Important files

- Root app layout: `src/app/layout.tsx`
- Authenticated layout: `src/app/(app)/layout.tsx`
- Global styles: `src/app/globals.css`
- Auth helpers: `src/lib/auth-utils.ts`
- Prisma schema: `prisma/schema.prisma`
- UI notes: `docs/design-system.md`
- Architecture notes: `docs/ARCHITECTURE_TECHNIQUE.md`
- Homelab/deploy notes: `docs/CLAUDE_HOMELAB_BRIEFING.md`

## Git workflow

- Main branch is `main`.
- Remote repo: `https://github.com/yootomy/Tablee.git`
- Typical flow:

```powershell
git status --short
git add -- <files>
git commit -m "type: short description"
git push origin main
```

- Prefer pushing first, then deploying.
- Do not run push and deploy in parallel: the server may pull the previous commit if deployment starts too early.

## Deployment workflow

- The reliable path is through the Proxmox host, not direct SSH to the CT.
- Proxmox host:
  - `192.168.1.106`
- Application container:
  - `CT112`
- App path inside CT112:
  - `/opt/Tablee`

### Deploy command

```powershell
ssh -o StrictHostKeyChecking=no root@192.168.1.106 "pct exec 112 -- bash -lc 'cd /opt/Tablee && git pull && npx prisma generate && npx next build && pm2 restart tablee --update-env'"
```

### What a normal deploy should do

1. `git pull`
2. `npx prisma generate`
3. `npx next build`
4. `pm2 restart tablee --update-env`

### After deploy

- Check that PM2 shows:
  - app name: `tablee`
  - status: `online`

## Validation commands

- For targeted file checks:

```powershell
npx eslint "<absolute-or-repo-path>"
```

- For full app validation:

```powershell
npm run build
```

- Use `npm run build` before pushing when the change touches app behavior or shared UI.

## Local-only files to avoid committing

- `.next-dev.err.log`
- `.next-dev.log`
- `starbucks.png`

## Editing guidance for future Claude sessions

- Favor updating existing shared components before creating duplicate UI patterns.
- Keep the app coherent across pages instead of making isolated visual exceptions.
- If a user asks to "deploy", assume they usually want:
  - commit if needed
  - push to GitHub
  - deploy to CT112
- If a user asks for a new feature that touches default location behavior, verify all these surfaces:
  - `Famille > Lieux`
  - `Courses`
  - `Nouveau repas`
  - `Calendrier`
  - recipe-to-shopping flows

## Short product reminder

The user's priority is a polished, coherent, mobile-friendly family app with simple UX. When in doubt:

- choose the cleaner UI
- reduce repetition
- preserve the established green design system
- prefer practical defaults over extra friction
