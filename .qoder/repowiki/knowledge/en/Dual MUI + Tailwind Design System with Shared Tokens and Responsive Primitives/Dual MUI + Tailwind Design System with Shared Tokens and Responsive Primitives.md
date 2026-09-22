---
kind: frontend_style
name: Dual MUI + Tailwind Design System with Shared Tokens and Responsive Primitives
category: frontend_style
scope:
    - '**'
source_files:
    - tailwind.config.js
    - styles/globals.css
    - styles/theme.ts
    - src/theme/professionalTheme.ts
    - postcss.config.js
    - hooks/useResponsiveStyles.ts
    - components/ui/Button.tsx
    - components/ui/Card.tsx
    - package.json
---

## What system/approach is used

The application uses a **hybrid styling approach** combining two systems:

1. **Material-UI (MUI) v5** as the primary component library, with a centralized theme defining palette, typography, breakpoints, shadows, and per-component style overrides for `MuiButton`, `MuiCard`, `MuiTextField`, `MuiAppBar`, `MuiDrawer`, `MuiChip`, `MuiAlert`, `MuiMenu`, `MuiTableContainer`, etc.
2. **Tailwind CSS v4** (via `@tailwindcss/postcss`) for utility-first styling of custom components, global base styles, and design tokens.

The two systems coexist: MUI handles complex interactive UI primitives while Tailwind composes layout, spacing, colors, and responsive rules in page-level and shared components.

## Key files and packages

- `src/theme/professionalTheme.ts` — secondary MUI theme using an orange (`#F6A623`) primary palette derived from the logo brand color.
- `styles/theme.ts` — the main MUI theme exported by the app, defining a blue (`#1976d2`) primary palette, full gray scale, extended breakpoints (`xs:0, sm:600, md:900, lg:1200, xl:1536`), custom shadow array, and extensive component overrides.
- `tailwind.config.js` — Tailwind token layer: custom `primary`, `background`, `app-bg`, `textMain`, `textMuted`, `danger`, `success`, `warning`, plus card accent colors (`card-blue`, `card-green`, `card-orange`, `card-purple`), border radii, and a `soft` box-shadow.
- `styles/globals.css` — imports Tailwind v4 via `@import "tailwindcss"` with `@config "../tailwind.config.js"`; defines `base` layer (Inter font, background/text defaults) and `components` layer with reusable `.card-shadow` and `.glass` utilities.
- `postcss.config.js` — registers `@tailwindcss/postcss` and `autoprefixer`.
- `hooks/useResponsiveStyles.ts` — responsive hook that reads MUI `theme.spacing()` and `useDeviceDetect` to return mobile/desktop values for spacing, typography, layout max-width, and component sizing.
- `components/ui/Button.tsx`, `components/ui/Card.tsx` — shared primitive components built on Tailwind utilities with `clsx` + `tailwind-merge` class composition; expose `variant`/`size` props mapped to Tailwind classes.
- `package.json` — declares `@mui/material`, `@emotion/*`, `tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`, `clsx`, `framer-motion`, `lucide-react`.

## Architecture and conventions

### MUI theme architecture
- Two theme definitions exist: `styles/theme.ts` (blue professional theme, the one actually wrapped around the app) and `src/theme/professionalTheme.ts` (orange brand variant). The MUI `ThemeProvider` wraps the app root to supply this theme globally.
- Breakpoints are customized beyond MUI defaults to `sm:600, md:900, lg:1200, xl:1536`, enabling finer-grained responsive behavior.
- Component overrides are declarative via `createTheme({ components: { ... } })`: buttons get gradient contained variants, cards lift on hover with a top-gradient bar, text fields use 2px borders with focus rings, tables have alternating row backgrounds, alerts are tinted by severity.
- Typography uses Inter as the first font family with clamp-based fluid sizing for headings and body text, including mobile media queries inside the theme.

### Tailwind token layer
- Colors are centralized in `tailwind.config.js` under `theme.extend.colors`. Semantic names (`primary`, `danger`, `success`, `warning`, `textMain`, `textMuted`) replace raw hex values in components.
- Card-specific accent colors (`card-blue`, `card-green`, `card-orange`, `card-purple`) provide status-driven card headers or badges.
- Global base styles set `bg-background text-textMain antialiased` and Inter font on `body`.
- Reusable component classes like `.card-shadow` and `.glass` live in `styles/globals.css` under `@layer components`.

### Custom component primitives
- The `components/ui/` directory holds framework-agnostic primitives (`Button`, `Card`, `Badge`, `Input`, `Modal`, `SearchInput`, `Select`, `StatCard`, `Label`). They compose Tailwind classes through a local `cn()` helper (`clsx` + `tailwind-merge`) so consumers can pass additional className overrides safely.
- Variants and sizes are prop-driven enums (`variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'`, `size?: 'sm' | 'md' | 'lg' | 'icon'`) rather than ad-hoc class strings.

### Responsive strategy
- Mobile-first via Tailwind's responsive prefixes combined with MUI breakpoint-aware theme overrides.
- `useResponsiveStyles` hook centralizes device-dependent values (spacing, typography, max-width, elevation, button/input heights) consumed by feature components, ensuring consistent mobile vs desktop sizing without scattered `window.innerWidth` checks.
- `useDeviceDetect` hook powers the responsive decisions.

### Iconography and motion
- Icons come from `lucide-react` (used in custom primitives) and `@mui/icons-material` (used with MUI components).
- Motion is provided by `framer-motion` for transitions and animations.

## Conventions and constraints

- **Colors must be referenced via Tailwind semantic tokens** (`bg-primary`, `text-textMain`, `bg-danger`, etc.) defined in `tailwind.config.js` rather than hard-coded hex values in components.
- **Custom UI primitives live in `components/ui/`** and should be reused across pages instead of building inline styled elements.
- **Global MUI theme overrides are the single source of truth** for MUI component appearance; new MUI components should extend `styles/theme.ts` `components` section rather than overriding inline.
- **Responsive values go through `useResponsiveStyles`** (or MUI's built-in `useMediaQuery` / breakpoint-aware theme) instead of direct window checks.
- **Typography uses Inter** as the primary font, declared in both the MUI theme and `globals.css`.
- **Breakpoint convention**: the project extends MUI breakpoints to include `xl:1536`, so large-screen layouts should target `xl` explicitly.
- **Class composition pattern**: all custom components use the `cn(...inputs)` helper built on `clsx` + `tailwind-merge` to merge variant/default/external classes deterministically.