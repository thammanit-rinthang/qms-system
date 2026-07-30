# Foundations

## 1. Source Of Truth

The visual baseline comes from five layers, in this order:

1. `app/globals.css`
2. `components/ui/*`
3. `components/common/*`
4. `rules/ui-forms-overlays.md`
5. `docs/UI-AUDIT.md`

If two rules conflict, prefer the more specific live component implementation, then use the audit file to identify whether the implementation is compliant or drift.

## 2. Brand Palette

### Primary Brand

- Primary: `#0F1059`
- Primary hover: `#161875`
- Primary content: `#FFFFFF`

Usage:

- Primary button
- Active navigation
- Page-title emphasis
- Primary badges
- Key action highlights

### Secondary Brand

- Secondary: `#1D6A8A`
- Secondary content: `#FFFFFF`

Usage:

- Secondary visual accents
- Gradient pair with primary
- Select module surfaces or illustrations

### Accent

- Accent: `#3B82F6`
- Accent content: `#FFFFFF`

Usage:

- Informational accents
- Highlighted visual utilities
- Selected non-destructive support elements

### Base Surfaces

- Base 100: `#FFFFFF`
- Base 200: `#F5F6FA`
- Base 300: `#E2E4EF`
- Base content: `#1F2937`

Usage:

- Base 100: cards, dialogs, sheets, table wrappers
- Base 200: app background
- Base 300: borders, subtle separators, dotted background texture

### Semantic Colors

- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

### Canonical Tailwind Usage

Preferred classes from the design skill:

- `bg-[#0F1059]` / `text-[#0F1059]`
- `hover:bg-[#161875]`
- `bg-slate-50` / `bg-slate-100`
- `border-slate-200`
- `text-slate-900`
- `text-slate-500` / `text-slate-600`
- `text-rose-600` / `bg-rose-50`
- `text-emerald-600` / `bg-emerald-50`
- `text-amber-600` / `bg-amber-50`
- `text-sky-600` / `bg-sky-50`

### Hard Prohibitions

- Do not use raw utility colors like `bg-red-500`, `bg-blue-600`, `text-green-700` as the default system language.
- Do not scatter hardcoded hex colors when a shared token or component variant exists.
- Do not mix DaisyUI `base-*` tokens with Tailwind `slate-*` tokens in a partially standardized app.

## 3. Typography

### Font Stack

Global font stack from `globals.css`:

- `var(--font-sarabun), var(--font-inter), system-ui, sans-serif`

This means:

- Thai-first readability
- clean enterprise body text
- one consistent system-wide sans stack

### Canonical Text Styles

From the design skill baseline:

| Element | Class |
| --- | --- |
| Page Title (h1) | `text-2xl font-bold text-slate-900` |
| Section Title (h2) | `text-lg font-semibold text-slate-800` |
| Card Title | `text-base font-semibold text-slate-900` |
| Body | `text-sm text-slate-700` |
| Label | `text-sm font-medium text-slate-700` |
| Caption / Meta | `text-xs text-slate-500` |
| Error | `text-xs text-rose-600` |

### Audit-Derived Text Styles In Active Use

| Element | Common Active Pattern |
| --- | --- |
| Page header title | `text-base md:text-lg font-bold text-primary` |
| Header subtitle | `text-[11px] md:text-xs text-neutral` |
| Section header | `text-base font-semibold text-slate-800` |
| Field label | `text-xs text-slate-500` |
| Body | `text-sm text-slate-700/800` |
| IDs / numbers | `font-mono` |

Guidance:

- Reuse one of the two approved scales consistently inside one app.
- Do not mix ad hoc `text-xl`, `text-[15px]`, `text-[12.5px]` headings unless there is a documented reason.

## 4. Radius

Global token intent:

- Selector radius: `0.375rem`
- Field radius: `0.5rem`
- Box radius: `0.75rem`

Canonical UI application:

- Card: `rounded-2xl` for main content cards
- Secondary card/header shell: sometimes `rounded-xl`
- Input: `rounded-xl`
- Button default: `rounded-xl`
- Button small: `rounded-lg`
- Bottom sheet: `rounded-t-2xl` or `rounded-t-3xl`
- Icon/button utility: `rounded-xl`

## 5. Shadow

Canonical main card shadow:

```css
shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

Secondary utility shadow:

- `shadow-sm`

Special utility surfaces:

- `card-premium`: lighter premium card shell
- `glass-panel`: translucent blurred panel
- `glass-sidebar`: gradient + blur + right shadow
- `topbar-surface`: radial texture + gradient + blur

Rule:

- Use the main card shadow for standard enterprise cards and tables.
- Use `shadow-sm` only for intentionally lighter utility shells.

## 6. Spacing

Canonical baseline:

- Page wrapper: `min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8`
- Audit/list container baseline: `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8`
- Narrow detail pages: `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8`
- Section gap: `space-y-4` or `space-y-6`
- Card padding: `p-4` mobile, `p-6` desktop

## 7. Motion

Defined reusable animations in `globals.css`:

- `float`
- `marquee`
- `ticker`
- `fade-up`
- `fade-in`
- `orb`
- `orb-reverse`
- `pulse-glow`
- `spin-slow`
- `beam`
- `skeleton-shimmer`

Usage rule:

- Motion must support feedback, hierarchy, or polish.
- Do not add arbitrary animation to normal CRUD surfaces.
- `Skeleton` shimmer is the default loading animation.

## 8. Background And Texture

Global app background:

- `var(--color-base-200)`
- subtle dotted radial pattern using `var(--color-base-300)`

This means the baseline app shell is not a plain flat white page.

## 9. Sidebar And Topbar Tokens

Sidebar tokens:

- `--sidebar-bg-from: #0F1059`
- `--sidebar-bg-to: #0A0B3E`
- hover/active/border/text variables in `:root`

Reusable sidebar utilities:

- `.sidebar-surface`
- `.sidebar-item`
- `.sidebar-item-active`
- `.sidebar-border-color`
- `.sidebar-text-muted`
- `.sidebar-text-color`
- `.sidebar-transition`

Topbar utility:

- `.topbar-surface`

## 10. Scrollbars

Shared behavior:

- hidden scrollbar utility via `.scrollbar-none`
- custom small scrollbar for visible regions

## 11. Global Utilities

Shared reusable utility classes:

- `.card-premium`
- `.glass-panel`
- `.glass-sidebar`
- `.sidebar-surface`
- `.sidebar-item`
- `.sidebar-item-active`
- `.topbar-surface`
- `.scrollbar-none`
- `.skeleton`
- `.card-section-title`
- `.th-pro`
- `.hover-lift`

## 12. Foundation-Level Non-Negotiables

1. Do not use inline `style={{}}` for standard system UI.
2. Do not use `any` in TypeScript UI code.
3. Do not introduce one-off components that duplicate `components/ui/*`.
4. Do not use raw hardcoded color semantics when a shared variant exists.
5. Do not use direct SharePoint expiring URLs in UI interactions.

