# Layout And Navigation

## 1. Page Containers

### Standard List / Dashboard Container

```tsx
mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8
```

Use for:

- module lists
- dashboards
- overview pages
- table-heavy pages

### Standard Narrow Detail Container

```tsx
mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8
```

Use for:

- detail pages
- approval views
- read-heavy document layouts

### Alternative Wrapper From Design Skill

```tsx
min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8
```

Use when:

- building a full-screen app shell
- wrapping page content inside dashboard layout boundaries

## 2. Page Header

Canonical component:

- `components/common/PageHeader.tsx`

Structure:

- left: title + optional subtitle
- right: actions

Current implementation classes:

- shell: `card-premium border border-slate-100 rounded-xl shadow-sm px-5 py-4 mb-6`
- layout: `flex items-center justify-between gap-4`
- title: `text-base md:text-lg font-bold text-primary leading-tight truncate`
- subtitle: `text-[11px] md:text-xs text-neutral mt-0.5`

Rule:

- Every primary page should have a visible page header.
- Client components should not own the page title if a server page can provide it.

Known drift from audit:

- KPI list
- KPI monthly
- Announcements
- Notifications

These were flagged because they render their own title sections instead of standard `PageHeader`.

## 3. Breadcrumbs

Canonical pattern:

- container: `flex items-center gap-2 text-sm text-slate-400`
- separator: `<ChevronRight className="h-3.5 w-3.5 shrink-0" />`
- current item: `text-slate-600 font-medium`

Rule:

- Use Lucide icon separators, not custom raw SVG arrows.

## 4. Cards

### Canonical Card Component

From `components/ui/card.tsx`:

- shell: `rounded-2xl border border-slate-100 bg-white text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- header: `p-6`
- content: `p-6 pt-0`
- footer: `p-6 pt-0`

### Legacy/Utility Card Shell

From audit baseline:

```tsx
bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

### Secondary Premium Shell

From `globals.css`:

- `.card-premium`

Use for:

- header bars
- utility panels
- filter bars
- lighter supporting sections

## 5. Tables

Canonical `components/ui/table.tsx` behavior:

- wrapper already includes white surface, border, shadow, and overflow
- header is sticky and uses `bg-slate-50`
- rows hover with subtle `bg-slate-50/50`
- cells use `p-4`

Audit baseline standard:

- wrapper: white card shell with `overflow-hidden`
- mobile fallback: card-per-row layout using `lg:hidden` and `hidden lg:block`

Rules:

1. Tables must live inside the standardized wrapper.
2. Large data tables should have mobile fallback cards unless the pattern is explicitly desktop-only.
3. Empty state must be present.
4. Skeleton rows should mirror the real table shape.

## 6. Filter Bars

Canonical component:

- `components/common/FilterBar.tsx`

Required behavior:

- debounced or controlled search field
- dropdown filters via shared Select
- optional clear-all
- result count
- optional slot for extra controls

Shell:

- `card-premium px-5 py-4 mb-4 flex flex-wrap gap-3 items-end`

Rules:

1. Use `FilterBar` for list filters unless there is a documented exception.
2. Search label must be explicit.
3. Counts should be visible when the page is filterable.

## 7. Pagination

Canonical component:

- `components/common/Pagination.tsx`

Shell:

- `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`

Rules:

- use shared previous/next Button controls
- keep page count and total visible
- audit baseline page size is commonly `20 items`

## 8. Detail Page Layout Patterns

Observed current system patterns:

- standard single-column detail shell
- split detail + sidebar shell
- tabbed detail shell
- document-centric full-page review shell

Approved use:

- different detail layouts are acceptable when driven by content density
- the shell still must honor shared card, spacing, header, and state rules

## 9. Tab Navigation

Current repo reality:

- KPI, Audit detail, and Audit My Tasks use custom tab state/button patterns
- no shared canonical `Tabs` abstraction is enforced yet

Standard for rollout:

- choose one system-wide approach
- either standardize on Radix/Shadcn Tabs
- or extract a shared `DetailTabs` component

Until then:

- keep tab labels readable
- keep active state visually obvious
- keep counts and section switching keyboard-accessible

## 10. Sidebar / App Shell Navigation

Sidebar rules from shared CSS:

- use gradient navy surface
- subtle hover overlay
- active item with stronger contrast and border
- animated small horizontal shift on hover

Navigation items should:

- remain readable at collapsed and expanded widths
- avoid raw color overrides
- use shared sidebar utility classes

