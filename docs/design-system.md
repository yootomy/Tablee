# Tablee Design System Notes

## Visual reference

- The dashboard is the primary visual reference for all in-app pages.
- Use `AppPageHeader` for application page headers.
- Use `FormSection` for grouped form content.
- Use `EmptyState` for zero-state messaging instead of ad hoc placeholders.

## Theme and tokens

- `Nunito` is the default font for body and headings.
- The green palette defined in `src/app/globals.css` is the product standard.
- Radius hierarchy is intentional:
  - pills and primary actions: `rounded-full`
  - inputs and small controls: `rounded-xl`
  - cards and major containers: `rounded-2xl`

## UI primitives

- We keep the current hybrid setup intentionally:
  - `@base-ui/react` provides the primitive behavior
  - local components in `src/components/ui/*` provide the visual system
  - `shadcn/tailwind.css` is kept for utility compatibility, not as the source of truth for component markup
- Prefer importing the local wrappers from `src/components/ui/*` instead of consuming `@base-ui/react` directly in feature code.

## Theme provider

- `next-themes` is wired in `Providers`, but the app is intentionally locked to light mode for now.
- This keeps hydration and future theming support ready without surprising users with an unfinished dark mode.

## Mobile and PWA

- Keep mobile inputs at `16px` on small screens to avoid iOS auto-zoom.
- Respect safe-area insets for bottom nav, dialogs and floating actions.
- The manifest must stay aligned with `basePath="/tablee"` for installed PWA behavior.
