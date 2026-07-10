# UI Audit Report

**Date:** 2026-06-29  
**Branch:** car-audit-module  
**Auditor:** Claude (AI assistant)  
**Scope:** All QMS modules — CAR, DAR, KPI, Audit (Plans, Appointments, Session Plans, Dashboard, My Tasks), Announcements, Notifications

---

## Global Standard (Baseline)

Derived from `rules/ui-forms-overlays.md` and the actual implementation patterns shared across all modules.

### Layout Standard
- Page container: `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8`
- Narrower detail pages: `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8`
- Page header: `<PageHeader title="..." subtitle="..." actions={...} />`

### Card Standard
```
bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
```

### Table Standard
- Wrapper: `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden`
- Rows: `hover:bg-slate-50 transition-colors`
- Header: `bg-slate-50` (via Shadcn TableHeader)
- Mobile fallback: card-per-row layout, `lg:hidden` / `hidden lg:block`

### FilterBar Standard
- Component: `<FilterBar>` from `components/common/FilterBar`
- Pagination: `<Pagination>` from `components/common/Pagination`
- Page size: 20 items

### Status Badge Standard
```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
```

### Form/Modal Standard (`rules/ui-forms-overlays.md`)
- Desktop: Radix `Dialog` (centered modal)
- Mobile: Radix `Sheet` with `side="bottom"`
- Footer actions fixed; body scrolls
- Multi-section forms: increase desktop width first, not nested steps

### Input Standard
```
w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30
```

### Empty State Standard
```
w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400
text-slate-800 font-semibold text-base mb-1 / text-slate-400 text-sm
```

### Loading State Standard
- `<Skeleton>` component with `animate-pulse`
- Skeleton rows mirroring table structure

### Primary Color
- `#0F1059` (dark navy) — used for page header title text, active nav, primary badges
- Hover: `#161875`

### Typography
- Page title: `text-base md:text-lg font-bold text-primary`
- Section header: `text-base font-semibold text-slate-800`
- Field label: `text-xs text-slate-500`
- Body: `text-sm text-slate-700/800`
- Mono IDs/numbers: `font-mono`

### Breadcrumb Standard
- `<nav>` with `flex items-center gap-2 text-sm text-slate-400`
- Separator: `<ChevronRight className="h-3.5 w-3.5 shrink-0" />` (Lucide)
- Current page: `text-slate-600 font-medium`

### Action Button Standard
- Primary: `<Button>` (default variant = `bg-primary`)
- Outline: `<Button variant="outline">`
- Icon-only: `<ActionIconButton tone="view|edit|delete|cancel">`
- Pill with label: `<ActionPillButton tone="edit|cancel">`
- Destructive: `<Button variant="destructive">`

---

## Module Audits

---

## CAR (Corrective Action Request)

### Business Function
Issue corrective action requests to departments for non-conformances. Track through response → verify → close lifecycle. MR signs to close.

### Screens
1. List page (`/car`, `/qms/car`)
2. Detail page (`/car/[id]`, `/qms/car/[id]`)
3. Create/Edit modal (CarFormModal)
4. Respond inline form (CarRespondForm)
5. Verify inline form (CarVerifyForm)
6. MR review modal (CarMrResponseReviewPanel)
7. MR sign dialog (CarMrSignDialog)
8. Issue dialog (CarIssueDialog)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Detail container | `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` component ✓ |
| List table | `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]` ✓ |
| FilterBar | Uses `<FilterBar>` + `<Pagination>` ✓ |
| Status badge | `CarStatusBadge` — `rounded-full text-xs font-medium` ✓ |
| Empty state | Centered icon + text pattern ✓ |
| Loading skeleton | `card-premium p-4` wrapper + row skeletons ✓ |
| Mobile cards | `lg:hidden` card layout ✓ |
| Date format | `Intl.DateTimeFormat("th-TH", { dateStyle: "medium" })` ✓ |

### Different UI (Deviations)

**1. Breadcrumb uses raw SVG instead of Lucide `<ChevronRight>`**
- Location: `CarDetailClient.tsx:145-148`
- Current: `<svg>` with hardcoded `path d="M9 5l7 7-7 7"`
- Standard: `<ChevronRight className="h-3.5 w-3.5 shrink-0" />`
- Seen in DAR detail page (`/dar/[id]`): uses Lucide correctly

**2. Detail page layout: `lg:grid-cols-3` (2/3 + 1/3 split)**
- Location: `CarDetailClient.tsx:224`
- Pattern: `grid grid-cols-1 gap-6 lg:grid-cols-3` (main + sticky sidebar timeline)
- This is a unique layout not used by any other module
- No standard defined; no inconsistency _between_ CAR pages, but different from Audit/DAR detail pages

**3. Action buttons use hardcoded Tailwind color classes instead of Button variant**
- Location: `CarDetailClient.tsx:199, 204, 215`
- Current: `className="bg-orange-500 hover:bg-orange-600"`, `bg-emerald-600 hover:bg-emerald-700"`, `bg-rose-600 hover:bg-rose-700"`
- Standard: destructive/colored actions should use `variant="destructive"` or defined variants
- Risk: color semantics differ (orange for Verify, emerald for MR approve, rose for ReCar)

**4. Respond prompt uses blue alert box with inline action**
- Location: `CarDetailClient.tsx:270-277`
- Current: `rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4`
- No equivalent component in other modules — unique pattern

**5. `PageHeader` uses `border-base-300` (DaisyUI token) not `border-slate-100`**
- Location: `components/common/PageHeader.tsx:48`
- Current: `card-premium border border-base-300 rounded-xl shadow-sm`
- The card uses `rounded-xl shadow-sm` but module cards use `rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- PageHeader rounds and shadow differ from content cards

**6. MR review/sign actions open as `Dialog` with no mobile Sheet fallback**
- Location: `CarDetailClient.tsx:410-441`
- Current: `<Dialog>` directly, `max-w-5xl max-h-[90vh] overflow-y-auto`
- Rule: mobile forms should use Sheet side="bottom"
- These are complex forms (signature pad, review table) that may be impractical on mobile, but the rule is violated

### Reason
CAR was the first module built. The inline respond/verify form pattern (forms appear inline on the detail page rather than in a modal) is a deliberate UX choice to keep context visible while filling out. The SVG breadcrumb is a remnant from pre-Lucide implementation.

### Recommendation
1. Replace raw SVG breadcrumb with `<ChevronRight>` from lucide-react — 2-line change
2. Extract action button color variants (orange=verify, emerald=approve, rose=destructive) to a shared utility or use Button `className` consistently
3. Consider creating a `<ContextualAlert>` component for the blue respond-prompt pattern if it appears in other modules
4. MR dialogs: acceptable exception to mobile Sheet rule given the signature pad complexity — document this as a known exception in `rules/ui-forms-overlays.md`

### Reusable Components
- `CarStatusBadge` — pattern reusable; each module already has its own; consider a generic `StatusBadge` factory
- `CarTimeline` — timeline pattern unique to CAR; Audit has no equivalent timeline
- `CarAttachmentUpload` — upload list + delete pattern matches DAR attachment pattern; could be unified

---

## DAR (Document Access Request)

### Business Function
Request controlled documents. Multi-step approval flow: requester → reviewer → approver → QMS processing → completed. Document distribution tracking.

### Screens
1. User list (`/dar`)
2. QMS list (`/qms/dar` — implied by QmsDarListClient)
3. Detail / read-only view (`/dar/[id]`)
4. Edit page (`/dar/[id]/edit`)
5. Review page (`/dar/[id]/review`)
6. Approval panel (DarApprovalPanel in approve routes)
7. Print template (DarPrintTemplate)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Breadcrumb | Uses `<ChevronRight>` from lucide-react ✓ |
| Status badge | `DarStatusBadge` — `rounded-full text-xs font-semibold` ✓ |
| Card style | `rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]` ✓ |
| Approval timeline | `DarApprovalTimeline` — vertical step pattern ✓ |
| Empty state | Consistent icon + text pattern ✓ |
| Date format | `th-TH` locale ✓ |

### Different UI (Deviations)

**1. Edit page uses FULL-PAGE form layout, not a modal**
- Location: `app/(dashboard)/(user)/dar/[id]/edit/page.tsx`
- Current: `<div className="max-w-[1400px] mx-auto px-4 md:px-8">` with `<DarForm>`
- Max width `1400px` — significantly wider than standard `max-w-7xl` (~1280px)
- No other module has a dedicated full-page edit route; CAR uses modal, Audit uses wizard page

**2. New DAR creation has no page header (`<PageHeader>`) — uses `DarNewHeader` and `DarEditHeader` instead**
- Location: `components/dar/DarNewHeader.tsx`, `DarEditHeader.tsx`
- Current: custom header components with back-button navigation
- These are module-specific headers inconsistent with the `<PageHeader>` standard used everywhere else

**3. QmsDarListClient does not use the shared `<FilterBar>` component**
- Location: `components/dar/QmsDarListClient.tsx`
- Current: custom filter UI built inline
- All other modules (CAR, Audit, KPI) use the shared `<FilterBar>` component

**4. `DarCardList` mobile card design differs from other modules**
- Location: `components/dar/DarCardList.tsx`
- Current: Card shows status + badge left-aligned with metadata below — no `border-slate-100 shadow-[...]` card wrapper; uses plain `bg-white` with `rounded-xl border border-base-200`
- `border-base-200` is DaisyUI token, not `border-slate-100` (Tailwind slate)

**5. `DarTableSkeleton` is a standalone component (not co-located in DarListClient)**
- Provides same loading skeleton pattern but split into a separate file; other modules inline their `TableSkeleton` function inside the list component
- Minor: no visual inconsistency, but structural inconsistency

**6. Approval panel (`DarApprovalPanel`) uses a dedicated full-page review layout, not a Dialog**
- Location: `components/dar/DarReviewLayout.tsx`, `DarApprovalPanel.tsx`
- Current: Entire page (`/dar/[id]/review`, `/approve/dar/[id]/reviewer`) renders the approval workflow as a full page
- Audit approval flow uses `AuditAppointmentApproveClient` in a similar full-page pattern — consistent with each other, but differs from CAR which does approval inline on the detail page

**7. `DarForm` field structure uses section components (DarRequesterSection, DarObjectiveSection, etc.) but `DarItemsSection` and `DarDistributionSection` have inconsistent padding**
- `DarObjectiveSection.tsx`: uses `space-y-3` between fields
- `DarItemsSection.tsx`: uses `space-y-2` between fields
- Minor visual rhythm difference within the same form

**8. SignaturePad is housed inside `components/dar/` but used by Audit components**
- Location: `components/dar/SignaturePad.tsx` (326 lines)
- Used by: `AuditAppointmentDetailClient.tsx` via `import SignaturePad from "@/components/dar/SignaturePad"`
- Should live in `components/shared/` or `components/common/`

### Reason
DAR was built with a document-centric full-page paradigm (document control is traditionally print-oriented). The wide `max-w-[1400px]` accommodates the multi-column distribution table. The approval full-page pattern is intentional to give reviewers full context.

### Recommendation
1. **High:** Move `SignaturePad` from `components/dar/` to `components/shared/` — it is already cross-module
2. **High:** Replace `border-base-200` with `border-slate-100` in `DarCardList` — DaisyUI/Tailwind token mismatch
3. **Medium:** Replace `DarNewHeader` / `DarEditHeader` with `<PageHeader>` + back-button `actions` prop
4. **Medium:** Refactor `QmsDarListClient` to use shared `<FilterBar>` component
5. **Low:** Standardize form section spacing to `space-y-3`

### Reusable Components
- `DarApprovalTimeline` — reusable; CAR has `CarTimeline`; both could share a `<ApprovalTimeline>` base
- `DarApprovalPanel` — complex but the layout pattern (left detail, right action panel) is reusable
- `SignaturePad` — already cross-module; move to shared

---

## KPI (Key Performance Indicator)

### Business Function
Department KPI objectives, monthly report submissions, MR/QMS review and approval. Token-based sign-off flow for monthly reports.

### Screens
1. KPI objectives list (`/qms/kpi`)
2. Department KPI detail (`/qms/kpi/[departmentId]`)
3. Monthly reports list (`/qms/kpi/monthly`)
4. Monthly report detail (within KpiDepartmentDetailClient tabs)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Table wrapper | `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]` ✓ |
| Status badge | Color-coded with border pattern ✓ |
| Pagination | Uses shared `<Pagination>` ✓ |
| Empty state | Icon + text centered ✓ |
| Loading skeleton | `animate-pulse` rows ✓ |
| Mobile cards | `lg:hidden` / `hidden lg:block` pattern ✓ |

### Different UI (Deviations)

**1. KPI list page has NO `<PageHeader>` component — renders `KpiObjectivesClient` directly**
- Location: `app/(dashboard)/qms/kpi/page.tsx`
- Current: `<KpiObjectivesClient>` renders directly — no `PageHeader` wrapper in the server page
- All other modules explicitly render `<PageHeader title="..." subtitle="..." />` in the server page component

**2. KPI monthly page also has no `<PageHeader>` in server page**
- Location: `app/(dashboard)/qms/kpi/monthly/page.tsx`
- Current: delegates entirely to `<KpiMonthlyClient>` which likely renders its own title inline
- Same issue as above

**3. `KpiDepartmentDetailClient` uses tab pattern but tabs are implemented with custom button state, not Shadcn Tabs**
- Location: `components/kpi/KpiDepartmentDetailClient.tsx`
- Current: custom `activeTab` state with button click, styled manually
- Audit module uses the same custom tab approach (`AuditPlanDetailClient`) — consistent within themselves, but no shared `<Tabs>` component is used

**4. `OkRatioBar` — custom progress bar component unique to KPI**
- Location: `components/kpi/KpiMonthlyTable.tsx`
- A horizontal progress bar showing OK ratio with Emerald/Rose fill
- No equivalent in other modules
- Not an inconsistency per se — KPI-specific visualization — but it's entirely custom, not using a shared progress component

**5. KPI status badges include icons (FileText, Clock, CheckCircle2, XCircle) while other module badges are text-only**
- Location: `components/kpi/KpiMonthlyTable.tsx`
- CAR, DAR, Audit status badges: text + color only
- KPI badges: icon + text — richer but inconsistent

**6. `font-mono` used for numeric KPI values — consistent with standard for IDs/numbers but applied broadly to all numeric fields**
- This is correct usage per standard but applied more aggressively than other modules

### Reason
KPI is data-dense: percentage values, month/year groupings, target vs actual comparisons. The `OkRatioBar` and icon badges exist to convey more information at a glance. The missing `<PageHeader>` is likely because KPI pages load their own titles inside the client components for i18n reasons.

### Recommendation
1. **High:** Add `<PageHeader>` to KPI server pages (`/qms/kpi/page.tsx`, `/qms/kpi/monthly/page.tsx`) — the client components should not own the page title
2. **Medium:** Extract `OkRatioBar` to `components/shared/OkRatioBar.tsx` for reuse in future dashboard widgets
3. **Low:** Align KPI status badge style — either add icons to other module badges (richer global standard) or remove icons from KPI badges (simpler global standard); pick one direction

### Reusable Components
- `OkRatioBar` — extract to shared; useful for any pass/fail ratio visualization
- KPI tab navigation pattern — same as Audit tabs; opportunity to create a shared `<DetailTabs>` component

---

## Audit — Plans

### Business Function
Create and manage internal/external audit plans. Track auditors, schedules, departments, findings, corrective actions, and report generation through to sign-off and closure.

### Screens
1. Dashboard (`/audit`)
2. Plans list (`/audit/plans`)
3. Plan detail (`/audit/plans/[id]`) — 7-tab layout
4. New plan page (`/audit/plans/new`) — wizard via `AuditPlanCreatePage`
5. My tasks (`/audit/my-tasks`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Detail container | `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` with title/subtitle ✓ |
| List table | Full card/shadow standard ✓ |
| FilterBar | Uses `<FilterBar>` + `<Pagination>` ✓ |
| Status badge | `AuditPlanStatusBadge` — rounded-full pattern ✓ |
| Empty state | Icon circle + text ✓ |
| Loading skeleton | `card-premium p-4` + row skeletons ✓ |
| Mobile cards | `lg:hidden` / `hidden lg:block` ✓ |
| Date format | `Intl.DateTimeFormat("th-TH", { dateStyle: "medium" })` ✓ |
| Action buttons | `<ActionIconButton>` for view/cancel ✓ |

### Different UI (Deviations)

**1. Dashboard `MetricCard` uses `border border-base-300 rounded-xl shadow-sm` — not the card standard**
- Location: `components/audit/AuditDashboardClient.tsx:34`
- Current: `bg-white border border-base-300 rounded-xl shadow-sm p-5`
- Standard: `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- `rounded-xl` vs `rounded-2xl`, `shadow-sm` vs custom shadow, `border-base-300` (DaisyUI) vs `border-slate-100` (Tailwind)

**2. Dashboard section cards also use `border-base-300` / `divide-base-200` / `hover:bg-base-50`**
- Location: `AuditDashboardClient.tsx:138-145`
- Current: `border border-base-300 rounded-xl shadow-sm` / `divide-y divide-base-200` / `hover:bg-base-50`
- Standard: `border-slate-100` / `divide-slate-100` / `hover:bg-slate-50`
- DaisyUI vs Tailwind token mismatch — most pervasive in the Audit Dashboard

**3. New plan page (`/audit/plans/new`) is a full-page wizard, not a modal**
- Location: `app/(dashboard)/audit/plans/new/page.tsx` → `<AuditPlanCreatePage>`
- Current: Dedicated route with multi-step wizard
- CAR creates via modal trigger on the list page
- No standard defined for this; both approaches are acceptable, but differs from CAR

**4. Tab navigation in plan detail is custom (not Shadcn Tabs)**
- Location: `components/audit/AuditPlanDetailClient.tsx`
- 7 tabs implemented with custom state + button styling
- Same approach as KPI — consistent with each other, but no shared tab component

**5. Attachment upload in plan detail uses raw `<input type="file">` without the shared `DarAttachmentUpload` pattern**
- Location: `AuditPlanDetailClient.tsx` — AttachmentsTab
- Current: `<input type="file" ref={fileInputRef}>` inline
- DAR has `DarAttachmentUpload` (595 lines) with full UX (drag-drop, preview, progress)
- Audit attachment UX is minimal by comparison

**6. Finding status badges use a different layout: category + severity as small inline chips, not a single status badge**
- Location: `AuditDashboardClient.tsx:211-221`
- Current: `text-[10px] font-medium ... rounded px-1.5 py-0.5` chips for category/severity
- This is appropriate for the data model (2 dimensions: category AND severity) but visually different from single-status badges in other modules

### Reason
The Audit module is the newest and most complex. The DaisyUI token usage in the dashboard is likely a copy-paste from a template or early prototype that wasn't cleaned up. The multi-step wizard for plan creation is justified by the number of fields.

### Recommendation
1. **High:** Replace all `border-base-300`, `divide-base-200`, `hover:bg-base-50` in `AuditDashboardClient` with `border-slate-100`, `divide-slate-100`, `hover:bg-slate-50` — pure token swap, no visual rework
2. **High:** Same token fix in `MetricCard` — change `rounded-xl shadow-sm` to `rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
3. **Medium:** Create a shared `<AttachmentUpload>` component merging DAR's full UX with Audit's simpler needs via props
4. **Low:** Extract custom tab navigation to a shared `<DetailTabs>` component (see KPI recommendation)

### Reusable Components
- `AuditPlanStatusBadge` — already following the standard badge pattern
- `AuditFindingStatusBadge` — same
- `MetricCard` inside AuditDashboardClient — extract and reuse for future dashboard widgets

---

## Audit — Appointments

### Business Function
Manage appointment letters for internal audit teams. Multi-step approval: submit → reviewer signs → approver signs → published. Includes session plan creation.

### Screens
1. Appointments list (`/audit/appointments`)
2. Appointment detail (`/audit/appointments/[id]`)
3. Approver page (`/approve/audit/appointments/[id]/approver`)
4. Reviewer page (`/approve/audit/appointments/[id]/reviewer`)
5. Create/Edit modal (`AuditAppointmentFormModal`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` ✓ |
| Status badge | `AuditAppointmentStatusBadge` — rounded-full pattern ✓ |
| Back navigation | `<ChevronLeft>` icon button ✓ |
| Approval flow | Full-page panel (same as DAR) ✓ |

### Different UI (Deviations)

**1. Appointment detail uses sidebar layout with `lg:grid-cols-[1fr_300px]` — unique to this component**
- Location: `components/audit/AuditAppointmentDetailClient.tsx`
- Current: `grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6`
- CAR uses `lg:grid-cols-3` (2/3 + 1/3), Audit plans detail doesn't use a sidebar
- All three detail layouts are different; no single standard exists

**2. `SessionPlanButton` is a raw `<button>` element with manual Tailwind classes, not using `<Button>` component**
- Location: `AuditAppointmentDetailClient.tsx:63-73`
- Current: `<button type="button" className="flex items-center gap-2 w-full rounded-xl border border-emerald-200..."`
- Standard: Use `<Button variant="outline">` or `<ActionPillButton>`

**3. SignaturePad imported from `components/dar/SignaturePad`**
- Location: `AuditAppointmentDetailClient.tsx:24`
- `import SignaturePad from "@/components/dar/SignaturePad"`
- Cross-module import from wrong directory — should be in `components/shared/`

**4. `AuditAppointmentFormModal` is a multi-step wizard (steps 1-4 + signature) inside a Dialog**
- The rule says "multi-section forms should prefer large desktop dialog width before introducing nested steps"
- This component uses nested steps inside a Dialog — violates the form overlay rule
- However the form is genuinely complex (4 distinct steps: Basic Info, Members, Standards, Review)

**5. `fmtDate` utility is defined locally in `AuditAppointmentDetailClient.tsx` (line 76-79) — duplicate of the same function in `CarListTable`, `AuditPlanListTable`, etc.**
- Every list/detail component defines its own `formatDate` or `fmtDate` function
- Should be a shared utility in `lib/utils.ts` or `lib/format.ts`

### Reason
The appointment letter is a formal document with complex content (team composition, standards, signatures). The multi-step form is justified. The sidebar layout gives quick access to signoff actions while viewing the main document content.

### Recommendation
1. **High:** Move `SignaturePad` from `components/dar/` to `components/shared/`
2. **High:** Extract `formatDate(iso, locale)` to `lib/format.ts` — used in 8+ components
3. **Medium:** Replace raw `<button>` in `SessionPlanButton` with `<Button variant="outline">` or `<ActionPillButton>`
4. **Low:** Document the multi-step Dialog as an approved exception in `rules/ui-forms-overlays.md` (when form has 4+ truly distinct logical steps, wizard inside Dialog is acceptable)

### Reusable Components
- `AuditAppointmentStatusBadge` — standard pattern
- `SessionPlanButton` — extract to a named component in `components/audit/`; currently inline

---

## Audit — Session Plans

### Business Function
Create and edit internal audit session plans (schedule table + Gantt chart). Linked to appointment letters.

### Screens
1. Session plans list (`/audit/session-plans`)
2. Session plan editor (`/audit/session-plans/[planId]`)
3. Session plan via appointment (`/audit/appointments/[id]/session-plan`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` ✓ |
| Card wrapper | Standard card shadow/border ✓ |

### Different UI (Deviations)

**1. `AuditSessionPlanClient` — Gantt chart is a fully custom table with week-column layout**
- No standard exists for Gantt charts; this is necessarily custom
- But the Gantt table uses inline styles and manual column widths — inconsistent with rest of system

**2. `AuditSessionPlanListClient` groups plans by year — unique grouping pattern not used elsewhere**
- Location: `components/audit/AuditSessionPlanListClient.tsx`
- Year-group headers with items nested underneath
- CAR and Audit Plans list are flat with filter-based grouping
- No inconsistency with a standard, but it's a unique navigation pattern

**3. Session plan editor has no mobile card fallback for the Gantt view**
- The session plan table/Gantt is complex enough that mobile support is impractical
- No `lg:hidden` / `hidden lg:block` pattern here — the only major table in the app without mobile fallback

**4. `AuditSessionPlanListClient` uses a `space-y-6` + year-heading structure rather than `<FilterBar>` + table**
- No search/filter capability on session plans list
- Other list pages all have search/filter; this is the only list page without it

### Reason
Session plans are structured documents with fixed structure (Gantt, schedule table). The year-grouping is natural for audit plans which are created annually. Gantt charts are inherently desktop-only.

### Recommendation
1. **Medium:** Add a year filter or search to `AuditSessionPlanListClient` — use `<FilterBar>` with a year select
2. **Low:** Document Gantt view as a desktop-only exception in `rules/ui-forms-overlays.md`
3. **Low:** Replace inline style column widths in Gantt with Tailwind if feasible

### Reusable Components
- Year-group header pattern — could be extracted as `<GroupedList>` for future modules

---

## Audit — Dashboard

### Business Function
Overview of all audit activity: plan counts by status, upcoming schedules (7 days), recent open findings.

### Screens
1. Audit dashboard (`/audit`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` ✓ |
| Grid layout | `grid-cols-2 md:grid-cols-3` for metric cards ✓ |

### Different UI (Deviations)

**1. `MetricCard` uses `border-base-300 rounded-xl shadow-sm` — DaisyUI + non-standard radius/shadow**
- Detailed above in Audit Plans section
- This is the most visible inconsistency in the Audit module

**2. Section panels (Upcoming Schedules, Recent Findings) use `border-base-300` + `divide-base-200`**
- Detailed above

**3. Error state is a plain centered `<div>` with `text-rose-600 text-sm` — no icon or action button**
- Location: `AuditDashboardClient.tsx:72-75`
- Standard: error state should show an icon, message, and a "retry" button
- CAR list error state: icon + message + `<Button variant="outline" onClick={refetch}>ลองใหม่</Button>` ✓
- Audit dashboard error state: just `text-rose-600` text, no retry action

### Recommendation
1. **High:** Fix DaisyUI token usage — replace `base-*` with `slate-*` throughout (already noted)
2. **Medium:** Add retry button to dashboard error state — match the pattern in `AuditPlanListTable.tsx:107-116`

---

## Audit — My Tasks

### Business Function
Personal view of all audit tasks: findings to respond to, findings to verify, plans I lead, pending sign-offs.

### Screens
1. My tasks (`/audit/my-tasks`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8` ✓ |
| Page header | Uses `<PageHeader>` ✓ |
| Tab navigation | Custom state tabs ✓ (consistent with KPI + Audit detail) |
| Empty state | Icon + text ✓ |
| Loading skeleton | `animate-pulse` ✓ |

### Different UI (Deviations)

**1. Tab badge counts use a raw `<span>` with `bg-primary/10 text-primary` — not a `<Badge>` component**
- Location: `components/audit/AuditMyTasksClient.tsx`
- Current: `<span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{count}</span>`
- Small inconsistency; `<Badge>` from `components/ui/badge.tsx` exists but isn't used here

**2. FindingRow and PlanRow sub-components are defined inline within the file**
- Over 200 lines of sub-components in the same file
- Not a visual inconsistency but a structural one — makes the file harder to maintain

### Recommendation
1. **Low:** Use `<Badge>` component for tab counts instead of raw `<span>`
2. **Low:** Extract `FindingRow` and `PlanRow` to separate files in `components/audit/`

---

## Announcements

### Business Function
View published system announcements from QMS/IT/HR/GA/SAFETY departments.

### Screens
1. Announcements list (`/announcements`)
2. View modal (`AnnouncementViewModal`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `max-w-7xl mx-auto w-full ... px-4 sm:px-6 lg:px-8` ✓ |
| Card wrapper | `bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]` ✓ |
| Empty/loading/error states | All three states handled ✓ |
| Date format | `th-TH` locale ✓ |

### Different UI (Deviations)

**1. Page is a `"use client"` component — the only module list page that is fully client-side**
- Location: `app/(dashboard)/announcements/page.tsx:1`
- Current: `"use client"` directive, fetches via React Query
- All other list pages are server components that pass `initialData` to client list tables
- Means no server-side render of the list — potentially slower first paint

**2. No `<PageHeader>` component — page renders its own custom title section**
- Location: `announcements/page.tsx:83-89`
- Current: `<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl ..."><h1 className="text-xl font-bold text-[#0F1059]">`
- Uses hardcoded `text-[#0F1059]` instead of `text-primary`
- Uses `text-xl` vs `<PageHeader>`'s `text-base md:text-lg`
- Uses `rounded-xl` icon wrapper — distinct from the standard page header style

**3. Row items use a color accent bar (`w-1 shrink-0 rounded-r-sm`) — unique decorative pattern**
- Location: `announcements/page.tsx:110-116`
- Current: left-side color bar that grows to `w-1.5` on hover
- No other module uses this decorative pattern

**4. Source system badges use solid colored pill with `text-white` — inverted from other badges**
- Location: `announcements/page.tsx:120-126`
- Current: `bg-[color] text-white` pill
- Standard: `bg-[color-50] text-[color-600] border-[color-200]` (soft background + colored text)

**5. External link action uses an icon-only `<a>` button, not `<ActionIconButton>`**
- Location: `announcements/page.tsx:129-138`
- Current: Raw `<a>` with Tailwind classes
- Standard: `<ActionIconButton>` for icon-only actions

### Reason
Announcements is a read-only display module, not a CRUD module. The "use client" pattern + custom styling reflects it was designed as a standalone display board rather than following the standard enterprise module pattern.

### Recommendation
1. **High:** Convert to server component with React Query initial data pattern (consistent with all other list pages)
2. **High:** Replace custom title section with `<PageHeader>` component
3. **Medium:** Align source badges to soft-background style: `bg-[color-50] text-[color-700] border border-[color-200]`
4. **Low:** Replace raw `<a>` external link with `<ActionIconButton>` or `<Button variant="ghost" size="icon">`

### Reusable Components
- Color accent bar row pattern — if adopted elsewhere, extract to a `<AccentRow>` component

---

## Notifications

### Business Function
In-app notification center. Real-time unread count, mark as read, deep-link to source document.

### Screens
1. Notifications view (`/notifications`)

### Common UI (Conforms to Standard)

| Area | Implementation |
|------|---------------|
| Page container | `max-w-3xl mx-auto py-8 px-4` (narrower — appropriate) |
| Card wrapper | Standard `rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]` ✓ |
| Empty state | Icon + text centered ✓ |
| Loading state | Skeleton rows ✓ |

### Different UI (Deviations)

**1. No `<PageHeader>` — `NotificationsView` renders its own title inline**
- Location: `app/(dashboard)/notifications/NotificationsView.tsx`
- Current: Inline `<h1>` or title in client component
- Same issue as KPI and Announcements

**2. Unread indicator uses a left border (`border-l-2 border-[#0f1059]`) — unique pattern**
- Location: `NotificationsView.tsx`
- Current: Active/unread item has a left border highlight
- This is a contextually appropriate pattern (common in notification UIs) but uses hardcoded `#0f1059` instead of `border-primary`

**3. Module color system defined locally in the notification component**
- Location: `NotificationsView.tsx`
- Per-module colors (`CAR: "#ea580c"`, `DAR: "#2563eb"`, etc.) defined as a local constant
- These should be in a central `lib/module-colors.ts` or `types/modules.ts` — currently duplicated between NotificationsView and potentially other places

**4. Active notification state uses `bg-[#0f1059]` with white text — inverted from all other selected states**
- Current: Full dark background with white text for active item
- Standard selected/active states: light background (`bg-primary/5` or `bg-slate-50`)

### Recommendation
1. **High:** Add `<PageHeader>` to notifications server page
2. **Medium:** Replace `border-[#0f1059]` and `bg-[#0f1059]` with `border-primary` / `bg-primary` Tailwind tokens
3. **Medium:** Extract module color map to `lib/module-colors.ts` — used in both Notifications and potentially future modules
4. **Low:** The inverted active state is a deliberate UX choice for notification lists (industry standard); acceptable but document it

### Reusable Components
- Module color map — extract to shared constants

---

## Cross-Module Issues

These issues appear in **2 or more modules** and should be fixed system-wide.

### Issue 1: DaisyUI `base-*` tokens mixed with Tailwind `slate-*` tokens

| Severity | High |
|---|---|
| Locations | `PageHeader.tsx` (`border-base-300`), `AuditDashboardClient.tsx` (`border-base-300`, `divide-base-200`, `hover:bg-base-50`), `DarCardList.tsx` (`border-base-200`), multiple other components |
| Impact | Visual inconsistency: `base-300` ≠ `slate-100` in most themes; makes theming/dark mode impossible |
| Fix | Global search-replace `border-base-300` → `border-slate-100`, `border-base-200` → `border-slate-100`, `divide-base-200` → `divide-slate-100`, `hover:bg-base-50` → `hover:bg-slate-50` |

### Issue 2: `formatDate` / `fmtDate` defined in every component

| Severity | Medium |
|---|---|
| Locations | `CarListTable.tsx`, `CarDetailClient.tsx`, `AuditPlanListTable.tsx`, `AuditPlanDetailClient.tsx`, `AuditAppointmentDetailClient.tsx`, `KpiMonthlyTable.tsx` |
| Impact | Inconsistent locale args; any change must be made in 8+ places |
| Fix | Extract to `lib/format.ts`: `export function fmtDate(iso: string \| null \| undefined, locale = "th-TH"): string` |

### Issue 3: `SignaturePad` in wrong directory

| Severity | Medium |
|---|---|
| Locations | `components/dar/SignaturePad.tsx` — imported by `AuditAppointmentDetailClient.tsx` |
| Impact | Cross-module import from a module-specific folder; couples DAR and Audit |
| Fix | Move to `components/shared/SignaturePad.tsx`; update imports in both modules |

### Issue 4: `INPUT_CLASS` defined locally in each form component

| Severity | Low-Medium |
|---|---|
| Locations | `CarFormModal.tsx`, `AuditPlanFormModal.tsx`, `AuditFindingFormModal.tsx`, `AuditAppointmentFormModal.tsx` |
| Impact | Any focus ring or border change must be applied to 4+ copies |
| Fix | Export `INPUT_CLASS` from `lib/styles.ts` or define in `components/ui/input.tsx` as the default className |

### Issue 5: Missing `<PageHeader>` in server pages

| Severity | Medium |
|---|---|
| Locations | `KPI list page`, `KPI monthly page`, `Announcements page`, `Notifications page` |
| Impact | Inconsistent page titles; some pages have no visible header component |
| Fix | Add `<PageHeader title="..." subtitle="..." />` to each server page component |

### Issue 6: Custom tab navigation duplicated in KPI and Audit

| Severity | Low |
|---|---|
| Locations | `KpiDepartmentDetailClient.tsx`, `AuditPlanDetailClient.tsx`, `AuditMyTasksClient.tsx` |
| Impact | Same tab button/state pattern implemented 3+ times; Shadcn Tabs not used |
| Fix | Either adopt Shadcn `<Tabs>` component or extract a shared `<DetailTabs items={[...]} activeTab={...} onTabChange={...} />` |

### Issue 7: Raw `<button>` used instead of `<Button>` component

| Severity | Low |
|---|---|
| Locations | `SessionPlanButton` in `AuditAppointmentDetailClient.tsx`, attachment action buttons in `CarDetailClient.tsx` |
| Impact | No focus ring, no keyboard accessibility from Button variant |
| Fix | Replace with `<Button variant="outline">` or `<ActionPillButton>` |

### Issue 8: Hardcoded hex colors instead of Tailwind tokens

| Severity | Low |
|---|---|
| Locations | `Announcements page` (`text-[#0F1059]`, `bg-[#0F1059]`), `NotificationsView` (`border-[#0f1059]`, `bg-[#0f1059]`), `DashboardHeader` |
| Impact | Scattered magic numbers; theming requires global grep |
| Fix | Use `text-primary`, `bg-primary`, `border-primary` — already defined as CSS custom property |

---

## Summary Table

| Module | Different UI Count | New Component Needed | Can Reuse Existing |
|--------|-------------------|---------------------|-------------------|
| **CAR** | 6 | `<ContextualAlert>` (respond prompt) | `CarTimeline` ← `DarApprovalTimeline` base; `CarAttachmentUpload` ← unified with DAR |
| **DAR** | 8 | none new needed | `DarApprovalTimeline` ← shared base; `SignaturePad` → move to shared; `<FilterBar>` already exists |
| **KPI** | 6 | `<OkRatioBar>` (extract to shared) | `<PageHeader>` (add); `<FilterBar>` (add year filter); `<DetailTabs>` (create) |
| **Audit Plans** | 6 | `<AttachmentUpload>` (unified) | `<FilterBar>` ✓; `<PageHeader>` ✓; `<ActionIconButton>` ✓ |
| **Audit Appointments** | 5 | none | `<Button>` (replace raw buttons); `lib/format.ts` (extract fmtDate) |
| **Audit Session Plans** | 4 | `<GroupedList>` (year grouping) | `<FilterBar>` (add year filter) |
| **Audit Dashboard** | 3 | none | fix token names only |
| **Audit My Tasks** | 2 | none | `<Badge>` (use existing) |
| **Announcements** | 5 | none | `<PageHeader>` (add); server component pattern |
| **Notifications** | 4 | `lib/module-colors.ts` (extract) | `<PageHeader>` (add) |

---

## Priority Fix List

### P1 — Do Now (Token / Structural Correctness)

1. Replace all `base-*` DaisyUI tokens with `slate-*` Tailwind tokens system-wide
2. Move `SignaturePad` to `components/shared/`
3. Add `<PageHeader>` to KPI list, KPI monthly, Announcements, and Notifications pages

### P2 — Next Sprint (Shared Utilities)

4. Extract `formatDate` to `lib/format.ts`
5. Extract `INPUT_CLASS` to `lib/styles.ts`
6. Extract module color map to `lib/module-colors.ts`
7. Extract `OkRatioBar` to `components/shared/OkRatioBar.tsx`
8. Convert Announcements page to server component with `initialData` pattern

### P3 — When Touching the Component (Incremental)

9. Replace raw `<button>` elements with `<Button>` or `<ActionPillButton>`
10. Replace hardcoded `#0F1059` hex with `primary` Tailwind token
11. Replace raw SVG chevron in `CarDetailClient` with Lucide `<ChevronRight>`
12. Add retry button to Audit Dashboard error state
13. Add year filter to Session Plans list
14. Standardize DAR `DarNewHeader` / `DarEditHeader` to use `<PageHeader>`
15. Extract shared `<DetailTabs>` component

### P4 — Design System (Future)

16. Decide on tab implementation standard: Shadcn Tabs vs custom (then apply globally)
17. Decide on icon-in-badge standard: KPI-style (richer) vs text-only (simpler)
18. Create `<ApprovalTimeline>` base component shared by CAR and DAR timelines
19. Create `<AttachmentUpload>` unified component (DAR rich UX + Audit simple mode via prop)
20. Document approved exceptions in `rules/ui-forms-overlays.md`: multi-step wizard in Dialog, desktop-only Gantt, MR signature dialog

---

*Report generated 2026-06-29. Based on full source code review of all module pages, client components, shared components, and `rules/ui-forms-overlays.md`.*
