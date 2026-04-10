# Tablee — Style Guide

> Direction visuelle inspirée du style Starbucks : épuré, moderne, fond blanc dominant, couleur verte signature, cards minimalistes, hiérarchie typographique forte.

---

## 1. Principes de design

| Principe | Description |
|----------|-------------|
| **Clarté** | Chaque écran a un objectif unique. Pas de surcharge visuelle. |
| **Respiration** | Beaucoup de whitespace. Les éléments respirent. |
| **Hiérarchie** | Un titre fort, un sous-texte discret, une action principale évidente. |
| **Chaleur** | Le vert évoque le frais, le fait-maison, la table familiale. |
| **Mobile-first** | Chaque composant est pensé pour le pouce d'abord. |

---

## 2. Palette de couleurs

### Couleurs principales

| Rôle | Nom | Hex | Usage |
|------|-----|-----|-------|
| **Primary** | Tablee Green | `#1E3932` | Boutons principaux, liens actifs, nav active |
| **Primary Light** | Leaf Green | `#00704A` | Hover, accents, badges, icônes |
| **Primary Soft** | Mint | `#D4E9E2` | Backgrounds légers, badges doux, tags |

### Couleurs neutres

| Rôle | Nom | Hex | Usage |
|------|-----|-----|-------|
| **Background** | White | `#FFFFFF` | Fond de page principal |
| **Surface** | Warm White | `#F9F9F9` | Cards, sections secondaires |
| **Border** | Light Gray | `#E8E8E8` | Bordures de cards, séparateurs |
| **Text Primary** | Almost Black | `#1E3A34` | Titres, texte principal |
| **Text Secondary** | Warm Gray | `#6B6B6B` | Sous-titres, descriptions, metadata |
| **Text Muted** | Soft Gray | `#9B9B9B` | Placeholders, timestamps |

### Couleurs de statut

| Rôle | Hex | Usage |
|------|-----|-------|
| **Success** | `#00754A` | Repas fait, article acheté |
| **Warning** | `#F2A900` | En attente, attention |
| **Error** | `#D62B1F` | Annulé, erreur, destructif |
| **Info** | `#1E3932` | Informations, prévu |

---

## 3. Typographie

Police : **Geist Sans** (déjà intégrée via Next.js) — propre, moderne, bonne lisibilité.

| Élément | Taille | Poids | Line-height | Couleur |
|---------|--------|-------|-------------|---------|
| **H1 — Page title** | 32px / `text-3xl` | Bold (700) | 1.2 | `#1E3A34` |
| **H2 — Section title** | 24px / `text-2xl` | Bold (700) | 1.3 | `#1E3A34` |
| **H3 — Card title** | 18px / `text-lg` | Semibold (600) | 1.4 | `#1E3A34` |
| **Body** | 16px / `text-base` | Regular (400) | 1.5 | `#1E3A34` |
| **Small / Meta** | 14px / `text-sm` | Regular (400) | 1.5 | `#6B6B6B` |
| **Caption** | 12px / `text-xs` | Medium (500) | 1.4 | `#9B9B9B` |
| **Button** | 14px / `text-sm` | Semibold (600) | 1 | White ou Primary |

---

## 4. Spacing & Layout

### Grille

- **Container max** : `max-w-6xl` (1152px) centré
- **Page padding** : `px-4` mobile, `px-6` tablet, `px-8` desktop
- **Section gap** : `gap-8` (32px) entre sections principales
- **Card gap** : `gap-4` (16px) entre cards dans une grille

### Spacing scale

| Token | Valeur | Usage |
|-------|--------|-------|
| `xs` | 4px | Padding interne icônes, micro-gaps |
| `sm` | 8px | Gap entre label et input, entre lignes |
| `md` | 16px | Padding interne cards, gap entre éléments |
| `lg` | 24px | Padding cards larges, sections |
| `xl` | 32px | Gap entre sections principales |
| `2xl` | 48px | Margin top/bottom de page |

---

## 5. Composants

### 5.1 Boutons

**Primary** (CTA principal) :
```
bg-[#00704A] text-white font-semibold text-sm
px-6 py-2.5 rounded-full
hover:bg-[#1E3932] transition-colors
```
- Toujours `rounded-full` (pill shape) comme Starbucks
- Un seul CTA primary par section visible

**Secondary / Outline** :
```
border border-[#1E3932] text-[#1E3932] font-semibold text-sm
px-6 py-2.5 rounded-full bg-transparent
hover:bg-[#1E3932] hover:text-white transition-colors
```

**Ghost** :
```
text-[#00704A] font-semibold text-sm
px-4 py-2 rounded-full bg-transparent
hover:bg-[#D4E9E2] transition-colors
```

**Destructive** :
```
bg-[#D62B1F] text-white font-semibold text-sm
px-6 py-2.5 rounded-full
hover:bg-[#B71C1C] transition-colors
```

### 5.2 Cards

```
bg-white rounded-2xl border border-[#E8E8E8]
p-6 shadow-none
hover:border-[#00704A]/30 transition-colors (si cliquable)
```

- **Pas de shadow** par défaut — séparation par bordure subtile
- `rounded-2xl` pour un look doux et moderne
- Cards cliquables : hover change la bordure en vert léger

### 5.3 Badges / Tags

**Status badge** :
```
rounded-full px-3 py-1 text-xs font-medium
```

| Status | Style |
|--------|-------|
| Prévu | `bg-[#D4E9E2] text-[#1E3932]` |
| Fait | `bg-[#00754A] text-white` |
| Annulé | `bg-[#FDECEA] text-[#D62B1F]` |

### 5.4 Inputs

```
h-10 w-full rounded-xl border border-[#E8E8E8] bg-white
px-4 text-sm text-[#1E3A34] placeholder:text-[#9B9B9B]
focus:border-[#00704A] focus:ring-2 focus:ring-[#00704A]/20
transition-colors
```

- `rounded-xl` (pas full, pas sharp)
- Focus vert avec ring subtil

### 5.5 Navigation

**Sidebar desktop** :
- Fond `#FFFFFF` avec bordure droite `#E8E8E8`
- Logo "Tablee" en `text-xl font-bold text-[#1E3932]`
- Liens : `text-sm text-[#6B6B6B]`, actif : `text-[#00704A] font-semibold bg-[#D4E9E2] rounded-xl`
- Icônes `size-5` à gauche du label

**Bottom nav mobile** :
- Fond blanc, bordure top `#E8E8E8`
- Icônes `size-5`, label `text-[10px]`
- Actif : icône + texte en `#00704A`
- Inactif : `#9B9B9B`

### 5.6 Dropdown / Select

```
rounded-xl border border-[#E8E8E8] bg-white
text-sm shadow-sm
```

- Menu déroulant : `rounded-xl bg-white border shadow-md`
- Item hover : `bg-[#F9F9F9]`
- Item actif/sélectionné : `text-[#00704A] font-semibold`

---

## 6. Iconographie

- **Librairie** : `lucide-react`
- **Taille standard** : `size-5` (20px) dans la nav, `size-4` (16px) inline
- **Style** : outline (stroke), pas filled
- **Couleur** : hérite du texte parent

---

## 7. Layouts de page

### Page standard

```
<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-[#1E3A34]">Titre</h1>
    <p class="mt-2 text-sm text-[#6B6B6B]">Description courte</p>
  </div>

  <!-- Action bar (optionnel) -->
  <div class="mb-6 flex items-center justify-between">
    <div><!-- Filtres --></div>
    <button><!-- CTA --></button>
  </div>

  <!-- Content -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <!-- Cards -->
  </div>
</div>
```

### Dashboard

- Header avec nom de famille + stats
- Grille 2x2 de stat cards (mobile) / 4 colonnes (desktop)
- Section "Actions rapides" avec boutons pill
- 2 colonnes : repas à venir | recettes + courses

### Calendrier

- Navigation semaine avec boutons pill outline
- Grille 7 colonnes (desktop) / 1 colonne (mobile)
- Chaque jour = card avec slots midi/soir
- Repas = mini-card cliquable dans le slot

### Liste de courses

- Sélecteur de lieu en haut
- 2 colonnes : à acheter | déjà acheté
- Chaque item = ligne avec checkbox ronde, nom, quantité badge

---

## 8. Animations & Transitions

| Élément | Transition |
|---------|-----------|
| Boutons | `transition-colors duration-200` |
| Cards hover | `transition-colors duration-200` |
| Inputs focus | `transition-colors duration-150` |
| Navigation | `transition-colors duration-200` |

- **Pas d'animations lourdes** — le site doit rester rapide et sobre
- **Pas de scale/transform** sur hover sauf cas exceptionnel
- Préférer les changements de couleur/bordure subtils

---

## 9. Responsive breakpoints

| Breakpoint | Largeur | Comportement |
|-----------|---------|-------------|
| Mobile | < 640px | 1 colonne, bottom nav, padding réduit |
| Tablet | 640px–1024px | 2 colonnes, bottom nav ou sidebar |
| Desktop | > 1024px | Sidebar + contenu, 3-4 colonnes grilles |

---

## 10. Do / Don't

### Do
- Beaucoup de blanc, laisser respirer
- Un seul CTA primary visible par écran
- Boutons pill (rounded-full) pour les actions
- Cards avec bordures subtiles, pas de shadow
- Vert comme fil conducteur visuel
- Typographie sobre, hiérarchie claire

### Don't
- Pas de gradients
- Pas de shadows lourdes (max `shadow-sm` si nécessaire)
- Pas de couleurs vives multiples — le vert domine, le reste est neutre
- Pas de bordures épaisses
- Pas d'icônes colorées individuellement — elles suivent le texte
- Pas de texte en gras partout — réserver le bold aux titres

---

## 11. Mapping Tailwind (theme overrides)

```ts
// Couleurs à configurer dans le thème Tailwind/CSS
--color-primary: #00704A;
--color-primary-dark: #1E3932;
--color-primary-soft: #D4E9E2;
--color-background: #FFFFFF;
--color-surface: #F9F9F9;
--color-border: #E8E8E8;
--color-text: #1E3A34;
--color-text-secondary: #6B6B6B;
--color-text-muted: #9B9B9B;
--color-success: #00754A;
--color-warning: #F2A900;
--color-error: #D62B1F;
```

---

## 12. Référence visuelle

Inspiration principale : **starbucks.com**
- Fond blanc dominant
- Vert signature comme couleur d'action
- Cards sans shadow, bordures légères
- Boutons pill (rounded-full)
- Typographie propre, espacement généreux
- Photos/visuels dans des conteneurs arrondis (cercles pour avatars/produits)
