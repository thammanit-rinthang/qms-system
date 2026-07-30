# Components

## 1. Button

Canonical source:

- `components/ui/button.tsx`

### Base Contract

- min tap target: `min-w-[44px]`
- rounded shape: `rounded-xl`
- focus ring: primary colored
- disabled: reduced opacity, no pointer events

### Variants

| Variant | Classes | Use |
| --- | --- | --- |
| `default` | `bg-[#0F1059] text-white hover:bg-[#161875]` | Primary action |
| `destructive` | `bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100` | Delete, destructive confirm |
| `outline` | `border border-slate-200 bg-white hover:bg-slate-50 text-slate-800` | Secondary action |
| `secondary` | `bg-slate-100 text-slate-800 hover:bg-slate-200` | Neutral action |
| `ghost` | `hover:bg-slate-100 text-slate-600 hover:text-slate-900` | Tertiary action |
| `link` | `text-[#0F1059] underline-offset-4 hover:underline` | Inline navigation |

### Sizes

| Size | Classes | Use |
| --- | --- | --- |
| `default` | `h-11 px-4 py-2` | Standard action |
| `sm` | `h-9 rounded-lg px-3` | Dense toolbars |
| `lg` | `h-12 rounded-xl px-8` | Large CTA |
| `icon` | `h-11 w-11` | Icon-only action |

### Rules

1. Use Button variants before custom color classes.
2. Do not use raw `<button>` for standard actions when Button already fits.
3. Primary action should be unique within a local action group.

## 2. Badge

Canonical source:

- `components/ui/badge.tsx`

### Variants

| Variant | Meaning |
| --- | --- |
| `default` | Primary / highlighted status |
| `secondary` | Neutral |
| `destructive` | Error / rejected / cancelled |
| `outline` | Neutral bordered |
| `success` | Approved / completed / active |
| `warning` | Pending / caution |
| `info` | In progress / informational |
| `draft` | Draft / inactive pre-state |

### Status Mapping

| Status | Badge Variant |
| --- | --- |
| `DRAFT` | `draft` |
| `PENDING_REVIEW`, `PENDING_APPROVAL`, `PENDING` | `warning` |
| `APPROVED`, `ACTIVE`, `COMPLETED`, success-close states | `success` |
| `REJECTED`, `CANCELLED` | `destructive` |
| `IN_PROGRESS`, `ISSUED`, `RESPONDED` | `info` |
| `OBSOLETE` | `secondary` |

### Rule

- Prefer soft-background semantic badges instead of saturated solid pills unless a documented exception applies.

## 3. Card

Canonical source:

- `components/ui/card.tsx`
- Comprehensive cross-system spec: [`07-text-card-standard.md`](file:///D:/NDC_042/NextJS/qms-system/docs/uxui/07-text-card-standard.md)

### Base Design Tokens
- Shape: `rounded-2xl` (`16px`)
- Border: `border border-slate-100` (`#F1F5F9`)
- Shadow: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- Surface: `bg-white`

Use for:

- content sections
- form groups
- detail blocks
- dashboard blocks

Do not create parallel card shells with different border/shadow/radius unless the file documents why. See `07-text-card-standard.md` for copy-paste implementations in Vanilla HTML/CSS, Tailwind, React, and Vue.

## 4. Dialog

Canonical source:

- `components/ui/dialog.tsx`

Key behavior:

- centered modal
- overlay `bg-black/30`
- content `max-w-lg` by default
- close button top-right
- title in primary navy

Rules:

1. Desktop and tablet focused forms use Dialog by default.
2. Dialog footer uses stacked-on-mobile then right-aligned desktop behavior.
3. Dialog must have visible title and close affordance.

## 5. Sheet

Canonical source:

- `components/ui/sheet.tsx`

Key behavior:

- bottom sheet available with drag handle
- side sheets for left/right/top/bottom
- bottom sheet uses `max-h-[92vh] rounded-t-2xl`

Rules:

1. Mobile form overlays use bottom sheet.
2. Bottom sheet must show a drag handle.
3. Close control must remain reachable.

## 6. ResponsiveFormOverlay

Canonical source:

- `components/common/ResponsiveFormOverlay.tsx`

This is the preferred wrapper when one workflow must support:

- desktop dialog
- mobile bottom sheet
- one shared form body
- fixed footer actions

Behavior:

- breakpoint switch at `max-width: 767px`
- desktop header/body/footer and mobile header/body/footer use same form state
- footer remains fixed while body scrolls

## 7. Input

Canonical source:

- `components/ui/input.tsx`

Current classes:

```tsx
flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm
placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1
focus-visible:border-[#0F1059] focus-visible:bg-white disabled:cursor-not-allowed
disabled:opacity-50 transition-colors
```

Rules:

1. Inputs should default to light neutral background.
2. Focus should brighten background and show primary border.
3. Input height should remain consistent across forms.

## 8. Textarea

Canonical source:

- `components/ui/textarea.tsx`

Rules:

- mirror Input styling
- use `resize-none` unless a specific free-resize requirement exists
- keep comfortable minimum height

## 9. Label

Labels must be present for form controls.

Pattern from rule set:

- use `Label` with every Input/Textarea where possible
- standard label text should visually match `text-sm font-medium text-slate-700` or `text-xs text-slate-500` depending on density

## 10. Select

Use shared `components/ui/select.tsx` through the design system.

Rule:

- do not create native-select styling islands if the app already ships the shared Select

## 11. Table

Use shared table primitives:

- `Table`
- `TableHeader`
- `TableBody`
- `TableRow`
- `TableHead`
- `TableCell`
- `TableCaption`

Keep hover, border, and sticky header behavior from the shared implementation.

## 12. Skeleton

Canonical source:

- `components/ui/skeleton.tsx`

Rule:

- Skeleton is the default loading placeholder.
- Spinner-only loading is not the standard.

## 13. Pagination

Use shared `components/common/Pagination.tsx`.

Do not reimplement page navigation unless requirements fundamentally differ.

## 14. Action Buttons

Canonical source:

- `components/common/ActionButtons.tsx`

### Types

- `ActionIconButton`
- `ActionPillButton`

### Supported Tones

- `view`
- `edit`
- `delete`
- `cancel`

### Tone Semantics

| Tone | Color Family | Meaning |
| --- | --- | --- |
| `view` | sky | inspect |
| `edit` | amber | modify |
| `delete` | rose | remove |
| `cancel` | orange | cancel / stop |

### Rules

1. Use these for repeated row actions.
2. Prefer icon action for compact tables.
3. Prefer pill action when the label improves clarity.

## 15. Confirm Modal

Canonical source:

- `components/common/ConfirmModal.tsx`

Pattern:

- danger icon block
- clear title/message
- outline cancel
- destructive or default confirm

Use for:

- delete
- cancel irreversible state
- confirm expensive operation

