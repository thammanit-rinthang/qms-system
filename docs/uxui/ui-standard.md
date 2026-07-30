# Global UI Standard

## Introduction

This document defines the global UI/UX standard for enterprise applications across the organization. It is grounded in the live repository source of truth and serves as the baseline for all application UI development.

**Source of Truth Priority:**
1. `app/globals.css`
2. `components/ui/*`
3. `components/common/*`
4. `rules/ui-forms-overlays.md`
5. `docs/UI-AUDIT.md`

When conflicts arise, prefer the more specific live component implementation, then use the audit file to identify whether the implementation is compliant or drift.

---

## 1. Design Tokens

### 1.1 Brand Colors

| Name | Value | Usage |
| --- | --- | --- |
| Primary | `#0F1059` | Primary buttons, active navigation, page title emphasis, primary badges, key action highlights |
| Primary Hover | `#161875` | Hover state of primary buttons |
| Primary Content | `#FFFFFF` | Text on Primary backgrounds |
| Secondary | `#1D6A8A` | Secondary visual accents, gradient pair with primary, select module surfaces or illustrations |
| Secondary Content | `#FFFFFF` | Text on Secondary backgrounds |
| Accent | `#3B82F6` | Informational accents, highlighted visual utilities, selected non-destructive support elements |
| Accent Content | `#FFFFFF` | Text on Accent backgrounds |

### 1.2 Base Surfaces

| Name | Value | Usage |
| --- | --- | --- |
| Base 100 | `#FFFFFF` | Cards, dialogs, sheets, table wrappers |
| Base 200 | `#F5F6FA` | App background |
| Base 300 | `#E2E4EF` | Borders, subtle separators, dotted background texture |
| Base Content | `#1F2937` | Primary text |

### 1.3 Semantic Colors

| State | Value | Usage |
| --- | --- | --- |
| Success | `#10B981` | Success, approved, completed |
| Warning | `#F59E0B` | Pending, caution |
| Error | `#EF4444` | Failure, delete, rejected |
| Info | `#3B82F6` | In progress, informational |
| Neutral | `#4B5563` | Non-primary, non-success, non-error text |

### 1.4 Tailwind Token Mapping

**Prohibited:** Do not use raw utility colors like `bg-red-500`, `bg-blue-600`, `text-green-700` as the default system language.

**Preferred:**
- `bg-[#0F1059]` / `text-[#0F1059]` / `hover:bg-[#161875]`
- `bg-slate-50` / `bg-slate-100`
- `border-slate-200`
- `text-slate-900`
- `text-slate-500` / `text-slate-600`
- `text-rose-600` / `bg-rose-50`
- `text-emerald-600` / `bg-emerald-50`
- `text-amber-600` / `bg-amber-50`
- `text-sky-600` / `bg-sky-50`

---

## 2. Typography

### 2.1 Font Stack

```
var(--font-sarabun), var(--font-inter), system-ui, sans-serif
```

- Thai-first readability
- Clean enterprise body text
- One consistent system-wide sans stack

### 2.2 Canonical Text Styles

| Element | Class | Usage |
| --- | --- | --- |
| Page Title (h1) | `text-2xl font-bold text-slate-900` | Main page heading |
| Section Title (h2) | `text-lg font-semibold text-slate-800` | Section heading |
| Card Title | `text-base font-semibold text-slate-900` | Card heading |
| Body | `text-sm text-slate-700` | Regular text |
| Label | `text-sm font-medium text-slate-700` | Form labels |
| Caption / Meta | `text-xs text-slate-500` | Supplementary information |
| Error | `text-xs text-rose-600` | Error messages |

### 2.3 Active Audit Patterns

| Element | Common Active Pattern |
| --- | --- |
| Page header title | `text-base md:text-lg font-bold text-primary leading-tight truncate` |
| Header subtitle | `text-[11px] md:text-xs text-neutral mt-0.5` |
| Section header | `text-base font-semibold text-slate-800` |
| Field label | `text-xs text-slate-500` |
| Body | `text-sm text-slate-700/800` |
| IDs / numbers | `font-mono` |

**Rules:**
- Reuse one approved scale consistently within a single application.
- Do not mix ad hoc `text-xl`, `text-[15px]`, `text-[12.5px]` headings unless there is a documented reason.

---

## 3. Color System

### 3.1 Primary Usage

- Primary buttons
- Active navigation items
- Page-title emphasis
- Primary badges
- Key action highlights

### 3.2 Secondary Usage

- Secondary visual accents
- Gradient pair with primary
- Select module surfaces or illustrations

### 3.3 Accent Usage

- Informational accents
- Highlighted visual utilities
- Selected non-destructive support elements

### 3.4 Hard Prohibitions

- Do not use raw utility colors like `bg-red-500`, `bg-blue-600`, `text-green-700` as the default system language.
- Do not scatter hardcoded hex colors when a shared token or component variant exists.
- Do not mix DaisyUI `base-*` tokens with Tailwind `slate-*` tokens in a partially standardized app.

---

## 4. Layout

### 4.1 Page Containers

**Standard List / Dashboard Container**
```
mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8
```
Use for: module lists, dashboards, overview pages, table-heavy pages

**Standard Narrow Detail Container**
```
mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8
```
Use for: detail pages, approval views, read-heavy document layouts

**Alternative Wrapper**
```
min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8
```
Use when: building a full-screen app shell, wrapping page content inside dashboard layout boundaries

### 4.2 Page Header

Canonical component: `components/common/PageHeader.tsx`

**Structure:**
- Left: title + optional subtitle
- Right: actions

**Classes:**
- Shell: `card-premium border border-slate-100 rounded-xl shadow-sm px-5 py-4 mb-6`
- Layout: `flex items-center justify-between gap-4`
- Title: `text-base md:text-lg font-bold text-primary leading-tight truncate`
- Subtitle: `text-[11px] md:text-xs text-neutral mt-0.5`

**Rules:**
- Every primary page should have a visible page header.
- Client components should not own the page title if a server page can provide it.

### 4.3 Breadcrumbs

- Container: `flex items-center gap-2 text-sm text-slate-400`
- Separator: `<ChevronRight className="h-3.5 w-3.5 shrink-0" />`
- Current item: `text-slate-600 font-medium`

Use Lucide icon separators, not custom raw SVG arrows.

### 4.4 Section Spacing

- Section gap: `space-y-4` or `space-y-6`
- Card padding: `p-4` mobile, `p-6` desktop

---

## 5. Spacing

### 5.1 Canonical Baseline

| Context | Class |
| --- | --- |
| Page wrapper | `min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8` |
| Audit/list container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` |
| Narrow detail page | `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8` |
| Section gap | `space-y-4` or `space-y-6` |
| Card padding (mobile) | `p-4` |
| Card padding (desktop) | `p-6` |

### 5.2 Spacing Rules

- Use a consistent spacing scale within a single application.
- Do not use scattered padding/margin values like `p-[13px]`, `m-[7px]` without a documented reason.

---

## 6. Radius

### 6.1 Token Intent

| Token | Value | Usage |
| --- | --- | --- |
| Selector | `0.375rem` | Dropdown, checkbox, radio |
| Field | `0.5rem` | Input, select |
| Box | `0.75rem` | Card, dialog, sheet |

### 6.2 Canonical Application

| Element | Class |
| --- | --- |
| Card (primary) | `rounded-2xl` |
| Card (secondary) / Header shell | `rounded-xl` |
| Input | `rounded-xl` |
| Button (default) | `rounded-xl` |
| Button (sm) | `rounded-lg` |
| Bottom Sheet | `rounded-t-2xl` or `rounded-t-3xl` |
| Icon/Button utility | `rounded-xl` |

---

## 7. Shadow

### 7.1 Main Card Shadow

```css
shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

### 7.2 Secondary Utility Shadow

- `shadow-sm` - use only for intentionally lighter utility shells

### 7.3 Special Utility Surfaces

- `card-premium`: lighter premium card shell
- `glass-panel`: translucent blurred panel
- `glass-sidebar`: gradient + blur + right shadow
- `topbar-surface`: radial texture + gradient + blur

**Rules:**
- Use the main card shadow for standard enterprise cards and tables.
- Use `shadow-sm` only for intentionally lighter utility shells.

---

## 8. Icon

### 8.1 Library

- Use **Lucide React** as the default icon library.
- Standard sizes: `h-4 w-4`, `h-3.5 w-3.5` for compact, `h-5 w-5` for larger.
- Use `stroke-width="2"` (default) or `stroke-width="1.5"` for dense displays.

### 8.2 Icon in Buttons

- Icon-only buttons must have `aria-label`.
- Default icon button: `h-11 w-11`
- Small icon button: `h-9 w-9`

### 8.3 Icon in Badges

- Badges may contain embedded icons but must maintain readability.
- Use consistent Lucide stroke-width across the system.

### 8.4 Icon Rules

- Use icons that clearly convey meaning; avoid overly complex icons.
- Icon size must match the button/component size.
- Do not use inline SVG directly when a Lucide icon matches the use case.

---

## 9. Button

### 9.1 Base Contract

- Min tap target: `min-w-[44px]`
- Rounded shape: `rounded-xl`
- Focus ring: primary colored (`focus-visible:ring-2 focus-visible:ring-[#0F1059]`)
- Disabled: reduced opacity, no pointer events

### 9.2 Variants

| Variant | Classes | Usage |
| --- | --- | --- |
| `default` | `bg-[#0F1059] text-white hover:bg-[#161875]` | Primary action |
| `destructive` | `bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100` | Delete, destructive confirm |
| `outline` | `border border-slate-200 bg-white hover:bg-slate-50 text-slate-800` | Secondary action |
| `secondary` | `bg-slate-100 text-slate-800 hover:bg-slate-200` | Neutral action |
| `ghost` | `hover:bg-slate-100 text-slate-600 hover:text-slate-900` | Tertiary action |
| `link` | `text-[#0F1059] underline-offset-4 hover:underline` | Inline navigation |

### 9.3 Sizes

| Size | Classes | Usage |
| --- | --- | --- |
| `default` | `h-11 px-4 py-2` | Standard action |
| `sm` | `h-9 rounded-lg px-3` | Dense toolbars |
| `lg` | `h-12 rounded-xl px-8` | Large CTA |
| `icon` | `h-11 w-11` | Icon-only action |

### 9.4 Button Rules

1. Use Button variants before custom color classes.
2. Do not use raw `<button>` for standard actions when Button already fits.
3. Primary action should be unique within a local action group.
4. Submit button must disable when pending and show loading feedback.

---

## 10. Form

### 10.1 Input

Canonical component: `components/ui/input.tsx`

**Classes:**
```
flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm
placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1
focus-visible:border-[#0F1059] focus-visible:bg-white disabled:cursor-not-allowed
disabled:opacity-50 transition-colors
```

**Rules:**
- Inputs should default to light neutral background.
- Focus should brighten background and show primary border.
- Input height should remain consistent across forms.

### 10.2 Textarea

Canonical component: `components/ui/textarea.tsx`

- Mirror Input styling.
- Use `resize-none` unless a specific free-resize requirement exists (document the reason).
- Define comfortable minimum height.

### 10.3 Label

- Labels must be present for form controls.
- Dense enterprise forms: `text-xs text-slate-500`
- General forms: `text-sm font-medium text-slate-700`

### 10.4 Select

Use `components/ui/select.tsx` through the design system. Do not create native-select styling islands if the app already ships the shared Select.

### 10.5 Form Structure

1. Header
2. Description (if needed)
3. Body sections
4. Sticky footer

**Desktop header:**
```
border-b border-slate-100 px-6 py-4 text-left
```

**Mobile header:**
```
border-b border-slate-100 px-4 pb-4 pt-2 text-left
```

**Body:**
```
flex-1 overflow-y-auto px-6 py-6
```

**Footer (Desktop):**
```
border-t border-slate-100 bg-white px-6 py-4
```

**Footer (Mobile):**
```
border-t border-slate-100 bg-white px-4 py-4
```

### 10.6 Form Submit Pattern

- Submit button must disable when pending.
- Submit button must show loading feedback.
- Cancel button should use `variant="outline"`.
- Confirm action should sit on the right.
- Maintain exactly one dominant submit action per form.
- If the form has a secondary destructive action, separate it visually from primary submit.
- If pending, block duplicate submission.

### 10.7 Multi-Section Forms

- Default rule: widen the desktop modal first.
- Avoid nested steps unless the form contains truly distinct logical phases.

### 10.8 Responsive Form Overlay

Canonical component: `components/common/ResponsiveFormOverlay.tsx`

| Device / Pattern | Component |
| --- | --- |
| Desktop modal form | Radix `Dialog` |
| Mobile form overlay | Radix `Sheet` with `side="bottom"` |
| Shared responsive container | `ResponsiveFormOverlay` |

Breakpoint switch at `max-width: 767px`
- Desktop: header/body/footer use the same form state
- Mobile: header/body/footer use the same form state
- Footer remains fixed while body scrolls

### 10.9 Prohibitions

1. Do not render the same create/edit workflow as a centered modal on phones.
2. Do not place critical submit/cancel actions deep inside long scroll content on mobile.
3. Do not create separate business logic implementations for desktop and mobile form containers when one shared body can be used.

---

## 11. Card

### 11.1 Canonical Card Component

Canonical component: `components/ui/card.tsx`

**Shell:**
```
rounded-2xl border border-slate-100 bg-white text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

**Sub-parts:**
- Header: `p-6`
- Content: `p-6 pt-0`
- Footer: `p-6 pt-0`
- Title: `text-lg font-semibold leading-none tracking-tight text-slate-800`
- Description: `text-sm text-slate-500`

### 11.2 Secondary Premium Shell

- `.card-premium` - use for header bars, utility panels, filter bars, lighter supporting sections

### 11.3 Card Rules

- Use `components/ui/card.tsx` for content sections, form groups, detail blocks, dashboard blocks.
- Do not create parallel card shells with different border/shadow/radius unless the file documents why.
- Card padding: `p-4` mobile, `p-6` desktop.

---

## 12. Dialog

### 12.1 Canonical Dialog

Canonical component: `components/ui/dialog.tsx`

**Key Behavior:**
- Centered modal
- Overlay: `bg-black/30`
- Content default: `max-w-lg`
- Close button top-right
- Title in primary navy (`text-[#0F1059]`)

**Classes:**
```
fixed left-[50%] top-[5%] z-[121] grid w-full max-w-lg translate-x-[-50%] translate-y-0
gap-4 border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

**Header:**
```
flex flex-col space-y-1.5 text-center sm:text-left
```

**Footer:**
```
flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0
```

**Close Button:**
- `absolute right-4 top-4`
- `opacity-70` → hover `opacity-100`
- `focus:ring-2 focus:ring-[#0F1059] focus:ring-offset-2`

### 12.2 Dialog Rules

1. Desktop and tablet focused forms use Dialog by default.
2. Dialog footer uses stacked-on-mobile then right-aligned desktop behavior.
3. Dialog must have visible title and close affordance.

---

## 13. Sheet

### 13.1 Canonical Sheet

Canonical component: `components/ui/sheet.tsx`

**Bottom Sheet (Mobile):**
```
inset-x-0 bottom-0 border-t border-slate-200
max-h-[92vh] rounded-t-2xl
```

**Side Sheets:**
- Left: `inset-y-0 left-0 h-full w-3/4 border-r border-slate-200 sm:max-w-sm rounded-r-2xl`
- Right: `inset-y-0 right-0 h-full w-full border-l border-slate-200 lg:w-1/2 rounded-l-2xl`

**Drag Handle (Bottom Sheet):**
```tsx
<div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-200" />
```

**Close Button:** Place on overlay or use absolute positioning.

### 13.2 Sheet Rules

1. Mobile form overlays use bottom sheet.
2. Bottom sheet must show a drag handle.
3. Close control must remain reachable.

---

## 14. Table

### 14.1 Canonical Table

Use shared primitives from `components/ui/table.tsx`:
- `Table`
- `TableHeader`
- `TableBody`
- `TableRow`
- `TableHead`
- `TableCell`
- `TableCaption`

### 14.2 Table Styling

**Wrapper:** white card shell + `overflow-hidden`

**Header:**
- Sticky
- `bg-slate-50`

**Rows:**
- Hover: `bg-slate-50/50`

**Cells:**
- `p-4`

**Pro Header (`.th-pro`):**
```
padding: 0.875rem 1rem !important;
font-size: 0.6875rem !important;
font-weight: 700 !important;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--color-neutral) !important;
white-space: nowrap;
user-select: none;
background: linear-gradient(to right, oklch(97.5% 0.012 264), var(--color-base-200)) !important;
```

### 14.3 Mobile Fallback

- Use card-per-row layout
- `lg:hidden` and `hidden lg:block`

### 14.4 Table Rules

1. Tables must live inside the standardized wrapper.
2. Large data tables must have mobile fallback cards unless explicitly desktop-only.
3. Empty state must be present.
4. Skeleton rows must mirror the real table shape.

---

## 15. Pagination

Canonical component: `components/ui/pagination.tsx` and `components/common/Pagination.tsx`

**Shell:**
```
bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

**Rules:**
- Use shared previous/next Button controls.
- Keep page count and total visible.
- Baseline page size: `20 items`.
- Do not reimplement page navigation unless requirements fundamentally differ.

---

## 16. Badge

### 16.1 Variants

| Variant | Classes | Usage |
| --- | --- | --- |
| `default` | `border-transparent bg-[#0F1059] text-white hover:bg-[#161875]` | Primary / highlighted status |
| `secondary` | `border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200` | Neutral |
| `destructive` | `border-transparent bg-rose-50 text-rose-600 border-rose-200` | Error / rejected / cancelled |
| `outline` | `text-slate-800 border-slate-200` | Neutral bordered |
| `success` | `border-transparent bg-emerald-50 text-emerald-600 border-emerald-200` | Approved / completed / active |
| `warning` | `border-transparent bg-amber-50 text-amber-600 border-amber-200` | Pending / caution |
| `info` | `border-transparent bg-sky-50 text-sky-600 border-sky-200` | In progress / informational |
| `draft` | `border-transparent bg-slate-50 text-slate-500 border-slate-200` | Draft / inactive pre-state |

### 16.2 Status Mapping

| Status | Badge Variant |
| --- | --- |
| `DRAFT` | `draft` |
| `PENDING_REVIEW`, `PENDING_APPROVAL`, `PENDING` | `warning` |
| `APPROVED`, `ACTIVE`, `COMPLETED`, success-close states | `success` |
| `REJECTED`, `CANCELLED` | `destructive` |
| `IN_PROGRESS`, `ISSUED`, `RESPONDED` | `info` |
| `OBSOLETE` | `secondary` |

### 16.3 Badge Rules

- Prefer soft-background semantic badges over saturated solid pills unless documented exception applies.
- Badge color must reflect actual semantic state.
- Do not invert badge style randomly between modules unless the exception is documented.

---

## 17. States

### 17.1 Loading

Canonical component: `components/ui/skeleton.tsx`

**Rules:**
- Skeleton is the default loading placeholder.
- Spinner-only loading is not the standard.
- Table pages should use skeleton rows that resemble the real table.
- Cards should use skeleton blocks with matching spacing.

**Example:**
```tsx
<div className="space-y-4">
  <Skeleton className="h-10 w-full rounded-xl" />
  <Skeleton className="h-32 w-full rounded-xl" />
</div>
```

### 17.2 Empty State

Canonical component: `components/common/EmptyState.tsx`

**Structure:**
- Floating illustration container
- Primary title
- Neutral description
- Optional CTA

**Rules:**
- Empty state must explain what is absent.
- If the user can act, provide CTA.
- Keep the layout centered and calm.

### 17.3 Error State

Canonical component: `components/common/ErrorComponent.tsx`

**Structure:**
- Prominent icon
- Short title
- Explanatory message
- Optional retry button

**Rules:**
- Error state should be actionable when retry is possible.
- Message must be plain language.
- Avoid unstyled red text floating alone in the page.

### 17.4 Confirmation

Canonical component: `components/common/ConfirmModal.tsx`

- Danger icon block
- Clear title/message
- Outline cancel
- Destructive or default confirm

**Use for:**
- Delete confirm
- Cancel irreversible state
- Confirm expensive operation

---

## 18. Accessibility

### 18.1 Focus Management

- All buttons must have visible focus ring.
- Focus ring uses primary color (`focus-visible:ring-2 focus-visible:ring-[#0F1059]`).
- Dialog and Sheet close buttons must be keyboard reachable.
- Icon-only actions must have `aria-label`.

### 18.2 Keyboard Navigation

- Tab navigation must work in all overlays.
- Modal/Sheet must trap focus when open.
- Close buttons must be reachable via keyboard.

### 18.3 Screen Reader

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`).
- Include `sr-only` text for icon-only buttons.
- Form labels must connect to controls via `htmlFor` / `id`.

### 18.4 Color Contrast

- Text on backgrounds must meet WCAG contrast ratio requirements.
- Do not rely on color alone to convey meaning; pair with icons or text.

### 18.5 Touch Targets

- All buttons must have min tap target `min-w-[44px]`.
- Standard input height: `h-11`.
- Spacing between interactive elements must be sufficient for touch.

---

## 19. Component Rules

### 19.1 General

- Use `components/ui/*` as the base component library.
- Use `components/common/*` for enterprise patterns reused across modules.
- Do not create one-off components that duplicate `components/ui/*`.
- Use `class-variance-authority` (cva) for variants.
- Use `clsx` + `tailwind-merge` (`cn`) for className merging.

### 19.2 Action Buttons

Canonical component: `components/common/ActionButtons.tsx`

**Types:**
- `ActionIconButton`
- `ActionPillButton`

**Supported Tones:**

| Tone | Color Family | Usage |
| --- | --- | --- |
| `view` | sky | Inspect |
| `edit` | amber | Modify |
| `delete` | rose | Remove |
| `cancel` | orange | Cancel / stop |

**Rules:**
- Use for repeated row actions.
- Prefer icon action for compact tables.
- Prefer pill action when the label improves clarity.

### 19.3 Confirm Modal

Canonical component: `components/common/ConfirmModal.tsx`

- Danger icon block
- Clear title/message
- Outline cancel
- Destructive or default confirm

---

## 20. State Management

### 20.1 Loading & Skeleton

- Use Skeleton as the default.
- Skeleton must mirror the shape of the real content.
- Do not use spinner-only blank screens.

### 20.2 Empty State

- Use `EmptyState` component.
- Provide CTA if the user can take action.

### 20.3 Error State

- Use `ErrorComponent`.
- Provide retry button if retry is possible.
- Message must be plain language.

### 20.4 Notification

- Toast: use `sonner` library.
- Inline alerts: use appropriate semantic color.

---

## 21. Global Utilities

### 21.1 Available Utilities

| Class | Usage |
| --- | --- |
| `.card-premium` | Premium card shell |
| `.glass-panel` | Translucent blurred panel |
| `.glass-sidebar` | Gradient + blur + right shadow |
| `.sidebar-surface` | Sidebar background |
| `.sidebar-item` | Sidebar nav item |
| `.sidebar-item-active` | Active sidebar nav item |
| `.topbar-surface` | Topbar background |
| `.scrollbar-none` | Hidden scrollbar |
| `.skeleton` | Skeleton loading |
| `.card-section-title` | Card section header with left accent |
| `.th-pro` | Table header pro style |
| `.hover-lift` | Hover lift effect |

### 21.2 Sidebar Tokens

```
--sidebar-bg-from:      #0F1059;
--sidebar-bg-to:        #0A0B3E;
--sidebar-hover:        rgba(255, 255, 255, 0.05);
--sidebar-active:       rgba(255, 255, 255, 0.1);
--sidebar-border:       rgba(255, 255, 255, 0.1);
--sidebar-text:         #9CA3AF;
--sidebar-text-muted:   #6B7280;
--sidebar-text-active:  #FFFFFF;
--sidebar-icon-active:  #38BDF8;
```

---

## 22. Motion

### 22.1 Defined Animations

| Animation | Purpose |
| --- | --- |
| `float` | Subtle floating |
| `marquee` | Horizontal marquee |
| `ticker` | Horizontal ticker |
| `fade-up` | Fade in + slide up |
| `fade-in` | Simple fade in |
| `orb` | Orb movement |
| `orb-reverse` | Reverse orb movement |
| `pulse-glow` | Pulsing glow |
| `spin-slow` | Slow spin |
| `beam` | Beam effect |
| `skeleton-shimmer` | Skeleton loading |

### 22.2 Motion Rules

- Motion must support feedback, hierarchy, or polish.
- Do not add arbitrary animation to normal CRUD surfaces.
- Skeleton shimmer is the default loading animation.

---

## 23. Background & Texture

### 23.1 Global App Background

```
background-color: var(--color-base-200);
background-image: radial-gradient(var(--color-base-300) 1px, transparent 1px);
background-size: 24px 24px;
```

Baseline app shell is not a plain flat white page.

---

## 24. Responsive Behavior

### 24.1 Breakpoints

| Breakpoint | Width |
| --- | --- |
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

### 24.2 Responsive Patterns

- Desktop: Dialog overlays
- Mobile (max-width: 767px): Bottom Sheet overlays
- Tables: Desktop table → Mobile card-per-row
- Page headers: `text-base md:text-lg`
- Subtitles: `text-[11px] md:text-xs`

### 24.3 Mobile Rules

1. Place close controls in easy-to-reach positions.
2. Avoid nested scrollable regions.
3. Button sizes must be large enough for touch (min 44px).
4. Show drag handle on bottom sheets.

---

## 25. Anti-Patterns & Drift

### 25.1 Common Drift Patterns

| Drift | Standard Direction |
| --- | --- |
| DaisyUI `base-*` mixed with Tailwind `slate-*` | Normalize to `slate-*` token language |
| Missing PageHeader on pages | Use PageHeader on all primary pages |
| Raw `<button>` instead of shared Button | Use shared Button component |
| Hardcoded hex colors outside shared tokens | Use `primary` token or shared variant |
| Repeated local utility implementations | Extract and centralize |

### 25.2 Hard Prohibitions

1. Do not use inline `style={{}}` for standard system UI.
2. Do not use `any` in TypeScript UI code.
3. Do not create one-off components that duplicate `components/ui/*`.
4. Do not use hardcoded color semantics when a shared variant exists.
5. Do not use direct SharePoint expiring URLs in UI interactions.
6. Do not call `window.open(spDownloadUrl)` directly - use `/api/sharepoint/get-file?itemId=...` or module-specific download endpoints.

---

## 26. Enterprise Rollout Checklist

Before claiming an application is compliant with this standard:

- [ ] Uses shared container widths.
- [ ] Every primary page has PageHeader.
- [ ] Shared Button/Badge/Card/Input components are used.
- [ ] Mobile forms use bottom sheet.
- [ ] Loading/empty/error states exist and are styled.
- [ ] No direct expiring SharePoint URLs are used.
- [ ] No uncontrolled mix of `base-*` and `slate-*` token families.
- [ ] Exceptions are documented explicitly.

---

## 27. Recommended Future Packaging

If this standard is promoted to a multi-application standard, split it into:

1. Theme tokens package
2. Shared UI components package
3. Shared enterprise patterns package
4. Application-specific module visual maps

This transforms the current repository from a "good reference implementation" into an actual design system.

---

*Document generated from live repository analysis*
*Last updated: 2026-07-13*
