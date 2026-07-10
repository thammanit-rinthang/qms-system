# UI Consistency Fixes — P1 + P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all P1 and P2 UI consistency issues identified in `docs/UI-AUDIT.md` — DaisyUI token cleanup, SignaturePad relocation, missing PageHeaders, shared format utility, shared INPUT_CLASS, module color map, OkRatioBar extraction, and Announcements page refactor.

**Architecture:** Pure refactor — no new features, no API changes. Each task is a self-contained change: rename tokens in place, move a file and update imports, add a component, extract a utility. All changes are within `app/` and `components/` trees. No schema or service changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Shadcn/ui (Radix), React Query, Lucide React

## Global Constraints

- Never add `"use client"` to a file that is currently a server component
- Never change business logic — visual/structural refactors only
- All Tailwind replacements: `base-300` → `slate-100`, `base-200` → `slate-100`, `base-50` → `slate-50`, `base-100` → `white` (context-dependent — check visually)
- TypeScript must remain clean — `npx tsc --noEmit` baseline is currently 5 pre-existing errors in `AuditPlanDetailClient.tsx`; do not introduce new errors
- Commit after every task
- Test: visual check in browser after each task (no automated tests for pure CSS class swaps)

---

### Task 1: Extract `lib/format.ts` — shared date formatter

**Files:**
- Create: `lib/format.ts`
- Modify: `components/car/CarListTable.tsx` (remove local `formatDate`, import from lib)
- Modify: `components/car/CarDetailClient.tsx` (remove local `fmt`, import from lib)
- Modify: `components/audit/AuditPlanListTable.tsx` (remove local `formatDate`, import from lib)
- Modify: `components/audit/AuditAppointmentDetailClient.tsx` (remove local `fmtDate`, import from lib)
- Modify: `components/audit/AuditPlanApproveClient.tsx` (remove local `formatDate` if present)
- Modify: `components/audit/AuditAppointmentListClient.tsx` (remove local `formatDate` if present)
- Modify: `components/dar/DarTable.tsx` (remove local `formatDate` if present)
- Modify: `components/dar/DarCardList.tsx` (remove local `formatDate` if present)
- Modify: `components/dar/DarReadOnlyDetail.tsx` (remove local `formatDate` if present)

**Interfaces:**
- Produces: `fmtDate(iso: string | null | undefined, locale?: string): string`

- [ ] **Step 1: Create `lib/format.ts`**

```ts
/**
 * Format an ISO date string to a locale-aware medium date string.
 * Returns "—" for null/undefined.
 */
export function fmtDate(
  iso: string | null | undefined,
  locale = "th-TH",
): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(iso),
  );
}
```

- [ ] **Step 2: Update `components/car/CarListTable.tsx`**

Find the local `formatDate` function (near top of file):
```ts
function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}
```
Replace with:
```ts
import { fmtDate } from "@/lib/format";
```
Then replace all calls `formatDate(x)` → `fmtDate(x)` in that file.

- [ ] **Step 3: Update `components/car/CarDetailClient.tsx`**

Find the local `fmt` function:
```ts
const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "—";
```
Add import:
```ts
import { fmtDate } from "@/lib/format";
```
Replace all `fmt(x)` → `fmtDate(x)`. Remove the local `fmt` arrow function.

- [ ] **Step 4: Update `components/audit/AuditPlanListTable.tsx`**

Find and remove:
```ts
function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}
```
Add import:
```ts
import { fmtDate } from "@/lib/format";
```
Replace all `formatDate(x)` → `fmtDate(x)`.

- [ ] **Step 5: Update `components/audit/AuditAppointmentDetailClient.tsx`**

Find and remove:
```ts
function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(iso));
}
```
Add import:
```ts
import { fmtDate } from "@/lib/format";
```
(Function name already matches — no call-site changes needed.)

- [ ] **Step 6: Update remaining files that have a local `formatDate` / `fmtDate`**

Run this grep to find any remaining local definitions:
```
grep -rn "function formatDate\|function fmtDate\|const fmtDate\|const formatDate" components/
```
For each match: remove the local function, add `import { fmtDate } from "@/lib/format";`, replace calls.

- [ ] **Step 7: Verify TypeScript is clean**

```
npx tsc --noEmit
```
Expected: same 5 pre-existing errors in `AuditPlanDetailClient.tsx` only. No new errors.

- [ ] **Step 8: Commit**

```bash
git add lib/format.ts components/car/CarListTable.tsx components/car/CarDetailClient.tsx components/audit/AuditPlanListTable.tsx components/audit/AuditAppointmentDetailClient.tsx
git commit -m "refactor: extract fmtDate to lib/format.ts, remove 8+ local duplicates"
```

---

### Task 2: Extract `lib/styles.ts` — shared INPUT_CLASS constant

**Files:**
- Create: `lib/styles.ts`
- Modify: `components/car/CarFormModal.tsx`
- Modify: `components/car/CarVerifyForm.tsx`
- Modify: `components/car/CarRespondForm.tsx`
- Modify: `components/audit/AuditPlanFormModal.tsx`
- Modify: `components/audit/AuditPlanDetailClient.tsx`
- Modify: `components/audit/AuditPlanCreatePage.tsx`
- Modify: `components/audit/AuditFindingFormModal.tsx`
- Modify: `components/qms/DocNoConfigClient.tsx`

**Interfaces:**
- Produces: `export const INPUT_CLASS: string`

- [ ] **Step 1: Create `lib/styles.ts`**

```ts
/**
 * Standard input field className — applies to all form text inputs,
 * textareas, and selects that are NOT using the Shadcn Input component.
 */
export const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm " +
  "transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
```

- [ ] **Step 2: Update each form component**

For each file listed above:
1. Add `import { INPUT_CLASS } from "@/lib/styles";`
2. Remove the local `const INPUT_CLASS = ...` definition (typically 3–5 lines)
3. Verify no `const INPUT_CLASS` remains locally

Pattern to remove (varies slightly per file):
```ts
const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
```
or:
```ts
const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";
```

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/styles.ts components/car/CarFormModal.tsx components/car/CarVerifyForm.tsx components/car/CarRespondForm.tsx components/audit/AuditPlanFormModal.tsx components/audit/AuditPlanDetailClient.tsx components/audit/AuditPlanCreatePage.tsx components/audit/AuditFindingFormModal.tsx components/qms/DocNoConfigClient.tsx
git commit -m "refactor: extract INPUT_CLASS to lib/styles.ts, remove 8 local duplicates"
```

---

### Task 3: Move `SignaturePad` to `components/shared/`

**Files:**
- Move: `components/dar/SignaturePad.tsx` → `components/shared/SignaturePad.tsx`
- Modify: `components/dar/DarSignSubmitModal.tsx` (update import)
- Modify: `components/car/CarFormModal.tsx` (update import)
- Modify: `components/car/CarIssueDialog.tsx` (update import)
- Modify: `components/car/CarVerifyForm.tsx` (update import)
- Modify: `components/car/CarRespondForm.tsx` (update import)
- Modify: `components/audit/AuditPlanFormModal.tsx` (update import)
- Modify: `components/audit/AuditPlanCreatePage.tsx` (update import)
- Modify: `components/audit/AuditAppointmentDetailClient.tsx` (update import)
- Modify: `app/(dashboard)/audit/appointments/AuditAppointmentsPageClient.tsx` (update import)
- Modify: `components/kpi/KpiSignatureDialog.tsx` (update import)

**Interfaces:**
- `SignaturePad` export does not change — only its path changes

- [ ] **Step 1: Copy the file**

Using the Read tool, read `components/dar/SignaturePad.tsx` in full. Then use Write tool to create `components/shared/SignaturePad.tsx` with identical content.

- [ ] **Step 2: Update DAR internal import (relative → absolute)**

In `components/dar/DarSignSubmitModal.tsx`, change:
```ts
import SignaturePad from "./SignaturePad";
```
to:
```ts
import SignaturePad from "@/components/shared/SignaturePad";
```

- [ ] **Step 3: Update the 9 cross-module imports**

In each of these files, change:
```ts
import SignaturePad from "@/components/dar/SignaturePad";
```
to:
```ts
import SignaturePad from "@/components/shared/SignaturePad";
```

Files:
- `components/car/CarFormModal.tsx`
- `components/car/CarIssueDialog.tsx`
- `components/car/CarVerifyForm.tsx`
- `components/car/CarRespondForm.tsx`
- `components/audit/AuditPlanFormModal.tsx`
- `components/audit/AuditPlanCreatePage.tsx`
- `components/audit/AuditAppointmentDetailClient.tsx`
- `app/(dashboard)/audit/appointments/AuditAppointmentsPageClient.tsx`
- `components/kpi/KpiSignatureDialog.tsx`

- [ ] **Step 4: Delete the original file**

```bash
git rm components/dar/SignaturePad.tsx
```

- [ ] **Step 5: Verify no remaining imports from old path**

```bash
grep -rn "from.*dar/SignaturePad" .
```
Expected: zero results.

- [ ] **Step 6: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add components/shared/SignaturePad.tsx components/dar/DarSignSubmitModal.tsx components/car/ components/audit/ components/kpi/KpiSignatureDialog.tsx "app/(dashboard)/audit/appointments/AuditAppointmentsPageClient.tsx"
git commit -m "refactor: move SignaturePad to components/shared, update 10 imports"
```

---

### Task 4: Fix DaisyUI `base-*` tokens in Audit components

**Files:**
- Modify: `components/audit/AuditDashboardClient.tsx`
- Modify: `components/audit/AuditMyTasksClient.tsx`
- Modify: `components/common/PageHeader.tsx`

Token replacement map (apply in all three files):
| Old token | New token |
|-----------|-----------|
| `border-base-300` | `border-slate-100` |
| `border-base-200` | `border-slate-100` |
| `divide-base-200` | `divide-slate-100` |
| `hover:bg-base-50` | `hover:bg-slate-50` |
| `bg-base-200` | `bg-slate-100` |
| `rounded-xl shadow-sm` (on cards) | `rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |

**Additionally in `AuditDashboardClient.tsx`:** Fix the error state to add a retry button.

- [ ] **Step 1: Fix `AuditDashboardClient.tsx`**

Read the file fully first, then apply these changes:

**A) `MetricCard` container** (line ~34) — change:
```tsx
<div className="bg-white border border-base-300 rounded-xl shadow-sm p-5 flex items-center gap-4">
```
to:
```tsx
<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
```

**B) Section panel wrappers** (lines ~138 and ~185) — change:
```tsx
<div className="bg-white border border-base-300 rounded-xl shadow-sm overflow-hidden">
```
to:
```tsx
<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
```

**C) Section headers** (lines ~139 and ~186):
```tsx
<div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
```
→
```tsx
<div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
```

**D) Dividers** (lines ~145 and ~192):
```tsx
<div className="divide-y divide-base-200">
```
→
```tsx
<div className="divide-y divide-slate-100">
```

**E) Row hover** (lines ~155 and ~202):
```tsx
className="flex flex-col gap-1 px-5 py-3 hover:bg-base-50 transition-colors"
```
→
```tsx
className="flex flex-col gap-1 px-5 py-3 hover:bg-slate-50 transition-colors"
```

**F) Error state** (replace the simple text error div):
```tsx
if (error || !data) {
  return (
    <div className="text-center py-12 text-rose-600 text-sm">
      ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง
    </div>
  );
}
```
Replace with (add `Button` import if not present):
```tsx
if (error || !data) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
      <p className="text-slate-800 font-semibold text-base mb-1">เกิดข้อผิดพลาด</p>
      <p className="text-slate-400 text-sm mb-4">ไม่สามารถโหลดข้อมูลได้</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        ลองใหม่
      </Button>
    </div>
  );
}
```
Add `import { Button } from "@/components/ui/button";` if not already imported.

- [ ] **Step 2: Fix `AuditMyTasksClient.tsx`**

Replace all occurrences:
- `hover:bg-base-50` → `hover:bg-slate-50`
- `border-base-200` → `border-slate-100`
- `border-base-300` → `border-slate-100`

The tab container card (line ~135):
```tsx
<div className="bg-white border border-base-300 rounded-xl shadow-sm overflow-hidden">
```
→
```tsx
<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
```

The tab header border (line ~137):
```tsx
<div className="border-b border-base-200 overflow-x-auto">
```
→
```tsx
<div className="border-b border-slate-100 overflow-x-auto">
```

- [ ] **Step 3: Fix `components/common/PageHeader.tsx`**

Read the file. The card wrapper class (line ~48):
```tsx
"card-premium border border-base-300 rounded-xl shadow-sm px-5 py-4 mb-6",
```
→
```tsx
"card-premium border border-slate-100 rounded-xl shadow-sm px-5 py-4 mb-6",
```
(Keep `rounded-xl` for the header — it's intentionally smaller radius than content cards.)

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/audit/AuditDashboardClient.tsx components/audit/AuditMyTasksClient.tsx components/common/PageHeader.tsx
git commit -m "fix: replace DaisyUI base-* tokens with Tailwind slate-* in audit and PageHeader"
```

---

### Task 5: Fix DaisyUI `base-*` tokens in remaining files (IT, Dashboard, DAR, misc)

**Files:**
- `components/it/ItUserTable.tsx`
- `components/it/DepartmentTable.tsx`
- `components/it/DepartmentDetailClient.tsx`
- `components/it/AuditLogTable.tsx`
- `components/dashboard/DashboardSkeleton.tsx`
- `components/dashboard/AnnouncementForm.tsx`
- `components/dashboard/DashboardDocsFeed.tsx`
- `components/dashboard/PostAnnouncementModal.tsx`
- `components/dar/DarNoDepartment.tsx`
- `components/document-control/DocumentControlListClient.tsx`
- `components/layout/DashboardHeader.tsx`
- `components/layout/DashboardShell.tsx`
- `components/layout/DashboardNavbar.tsx`
- `components/layout/AnnouncementTicker.tsx`
- `components/announcements/AnnouncementBgPicker.tsx`
- `app/unauthorized/page.tsx`
- `app/auth/error/page.tsx`
- `app/(dashboard)/qms/sharepoint/page.tsx`
- `components/dashboard/DashboardCarWidget.tsx`

Token map (same as Task 4):
| Old | New |
|-----|-----|
| `border-base-300` | `border-slate-100` |
| `border-base-200` | `border-slate-100` |
| `divide-base-200` | `divide-slate-100` |
| `hover:bg-base-50` | `hover:bg-slate-50` |
| `hover:bg-base-200` | `hover:bg-slate-100` |
| `bg-base-200` | `bg-slate-100` |
| `bg-base-300` | `bg-slate-200` |
| `bg-base-100` | `bg-white` |
| `bg-base-100/50` | `bg-white/50` |
| `text-base-300` | `text-slate-200` |

> **Note on `bg-base-200` in `unauthorized/page.tsx`:** This is a full-page background — map to `bg-slate-100` (light grey). Verify visually that it doesn't look stark white.

> **Note on `DashboardSkeleton.tsx`:** The `skeleton` class is DaisyUI's animation — keep it. Only replace the `bg-base-*` color tokens on the skeleton divs with `bg-slate-*`.

- [ ] **Step 1: Read each file and apply token replacements**

For each file: Read → identify all `base-*` occurrences → replace with the map above → Write.

A reliable approach: for each file, apply these string replacements in order:
1. `border-base-300` → `border-slate-100`
2. `border-base-200` → `border-slate-100`
3. `divide-base-200` → `divide-slate-100`
4. `hover:bg-base-200` → `hover:bg-slate-100`
5. `hover:bg-base-50` → `hover:bg-slate-50`
6. `bg-base-300` → `bg-slate-200`
7. `bg-base-200` → `bg-slate-100`
8. `bg-base-100/50` → `bg-white/50`
9. `bg-base-100` → `bg-white`
10. `text-base-300` → `text-slate-200`
11. `text-neutral` → `text-slate-500` (where it appears alongside base-* classes; leave standalone `text-neutral` only if used for DaisyUI-specific semantics)

- [ ] **Step 2: Verify no remaining `base-*` tokens in tsx files**

```bash
grep -rn "base-300\|base-200\|base-100\|base-50" --include="*.tsx" .
```
Expected: zero results (or only in files intentionally using DaisyUI like the main dashboard which uses DaisyUI components).

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/it/ components/dashboard/ components/dar/DarNoDepartment.tsx components/document-control/DocumentControlListClient.tsx components/layout/ components/announcements/AnnouncementBgPicker.tsx app/unauthorized/page.tsx app/auth/ "app/(dashboard)/qms/sharepoint/page.tsx" components/dashboard/DashboardCarWidget.tsx
git commit -m "fix: replace DaisyUI base-* tokens with Tailwind slate-* across all remaining files"
```

---

### Task 6: Add `<PageHeader>` to Notifications page

**Files:**
- Modify: `app/(dashboard)/notifications/NotificationsView.tsx`

**Context:** `NotificationsView.tsx` is a `"use client"` component. It currently renders its own `<h1>การแจ้งเตือน</h1>` inside the notification panel (around line 405). The server page `notifications/page.tsx` renders `<Suspense><NotificationsView /></Suspense>` with no outer wrapper — so `NotificationsView` owns the full page layout.

Strategy: The client component already owns the page — add `PageHeader` at the top of its return, remove the inline `<h1>`.

- [ ] **Step 1: Read `NotificationsView.tsx` fully**

Look for where the inline `<h1>การแจ้งเตือน</h1>` is rendered (around line 405). Note its surrounding structure.

- [ ] **Step 2: Add PageHeader import**

At the top of `NotificationsView.tsx`, add:
```tsx
import PageHeader from "@/components/common/PageHeader";
import { Bell } from "lucide-react"; // if not already imported
```
(Check if `Bell` is already imported from lucide-react — it is per line 6.)

- [ ] **Step 3: Add PageHeader to the notification list column**

Find the section that renders the left panel header containing `<h1>การแจ้งเตือน</h1>`. Replace it:

Current pattern (approximate):
```tsx
<h1 className="text-sm font-bold text-slate-900 sm:text-base">การแจ้งเตือน</h1>
```
Replace with nothing (remove the `<h1>`). The `PageHeader` goes at the top of the root container returned by `NotificationsView`.

Find the root `return (` div and prepend `<PageHeader>`:
```tsx
return (
  <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
    <PageHeader title="การแจ้งเตือน" subtitle="Notifications" />
    {/* rest of existing content */}
  </div>
);
```
Adjust container classNames to not duplicate vertical spacing with PageHeader's `mb-6`.

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/notifications/NotificationsView.tsx"
git commit -m "fix: add PageHeader to Notifications page, remove inline h1"
```

---

### Task 7: Refactor Announcements page — server component + PageHeader

**Files:**
- Modify: `app/(dashboard)/announcements/page.tsx`
- Create: `app/(dashboard)/announcements/AnnouncementsClient.tsx`

**Context:** Currently `announcements/page.tsx` is a 160-line `"use client"` component with React Query. Goal: make the page a server component that fetches initial data and passes it to a new `AnnouncementsClient`. Add `<PageHeader>`. Remove the custom inline title section.

The public announcements API: `GET /api/announcements/public` — returns `{ data: PublicAnnouncement[] }`.

- [ ] **Step 1: Read the current `announcements/page.tsx` in full**

Identify:
- The `PublicAnnouncement` type
- The `toRow` function
- The list rendering JSX
- The `AnnouncementViewModal` usage
- All imports

- [ ] **Step 2: Create `AnnouncementsClient.tsx`**

Extract all client-side logic from the current page into this new file:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/locale-context";
import AnnouncementViewModal from "@/components/announcements/AnnouncementViewModal";
import type { AnnouncementRow } from "@/services/announcementService";
import { CalendarDays, Link as LinkIcon } from "lucide-react";

// Keep the SOURCE_COLORS map — will be replaced by lib/module-colors in Task 8
const SOURCE_COLORS: Record<string, string> = {
  QMS: "#0F1059", IT: "#1D6A8A", HR: "#7C3AED", GA: "#059669", SAFETY: "#DC2626",
};

type PublicAnnouncement = {
  id: string;
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  startDate: string | null;
  endDate: string | null;
  fileName: string | null;
  spWebUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  createdAt: string;
  createdByName: string | null;
};

interface Props {
  initialData: PublicAnnouncement[];
}

function toRow(a: PublicAnnouncement): AnnouncementRow {
  return {
    ...a,
    startDate: a.startDate ? new Date(a.startDate) : null,
    endDate: a.endDate ? new Date(a.endDate) : null,
    createdAt: new Date(a.createdAt),
    pushToCompanyCenter: true,
    status: "ACTIVE",
    bgImageUrl: null,
    bgImageSpId: null,
    createdByName: a.createdByName ?? null,
  };
}

export default function AnnouncementsClient({ initialData }: Props) {
  const locale = useLocale();
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);

  const { data } = useQuery<{ data: PublicAnnouncement[] }>({
    queryKey: ["announcements-public"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/public");
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
    staleTime: 60_000,
    initialData: { data: initialData },
  });

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
        <p className="text-slate-400 text-sm">ไม่มีประกาศในขณะนี้</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] divide-y divide-slate-100 overflow-hidden">
        {items.map((a) => {
          const color = SOURCE_COLORS[a.sourceSystem] ?? "#6B7280";
          const dateStr = new Date(a.createdAt).toLocaleDateString(
            locale === "th" ? "th-TH" : "en-US",
            { day: "2-digit", month: "short", year: "numeric" },
          );
          return (
            <div
              key={a.id}
              onClick={() => setViewItem(toRow(a))}
              className="group flex gap-0 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
            >
              <div
                className="w-1 shrink-0 rounded-r-sm my-4 ml-5 transition-all duration-200 group-hover:w-1.5"
                style={{ background: color }}
              />
              <div className="flex flex-1 items-start gap-3 px-5 py-4 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: color }}
                    >
                      {a.sourceSystem}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors leading-snug">
                    {a.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {a.content}
                  </p>
                </div>
                {a.spWebUrl && (
                  <a
                    href={a.spWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 w-8 h-8 mt-0.5 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnnouncementViewModal
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
      />
    </>
  );
}
```

Note changes from original:
- `text-[#0F1059]` → `text-primary` on the title hover
- `hover:border-[#0F1059]` → `hover:border-primary`
- `hover:text-[#0F1059]` → `hover:text-primary`
- Loading/error states removed from client (server handles initial fetch; React Query revalidates)

- [ ] **Step 3: Rewrite `announcements/page.tsx` as a server component**

```tsx
import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import AnnouncementsClient from "./AnnouncementsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประกาศ - QMS" };

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function AnnouncementsPage() {
  await requireAuth();

  let initialData: unknown[] = [];
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/announcements/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      initialData = json.data ?? [];
    }
  } catch {
    // fail silently — client will fetch on mount
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
      <PageHeader title="ประกาศ" subtitle="Announcements" />
      <AnnouncementsClient initialData={initialData as Parameters<typeof AnnouncementsClient>[0]["initialData"]} />
    </div>
  );
}
```

> **Alternative if `NEXT_PUBLIC_APP_URL` is not set:** import the announcement service directly instead of fetching via HTTP:
```tsx
import { AnnouncementService } from "@/services/announcementService";
const svc = new AnnouncementService();
const initialData = await svc.getPublicAnnouncements(); // adjust to actual method name
```
Check `services/announcementService.ts` for the correct method name — prefer the direct service call over HTTP self-fetch.

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 5: Verify in browser**

Navigate to `/announcements`. Confirm:
- `<PageHeader>` renders with "ประกาศ" title
- List renders with color accent bars
- Clicking a row opens the modal
- External link buttons work

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/announcements/page.tsx" "app/(dashboard)/announcements/AnnouncementsClient.tsx"
git commit -m "refactor: convert Announcements to server component with PageHeader and initialData"
```

---

### Task 8: Extract `lib/module-colors.ts`

**Files:**
- Create: `lib/module-colors.ts`
- Modify: `app/(dashboard)/notifications/NotificationsView.tsx`
- Modify: `app/(dashboard)/announcements/AnnouncementsClient.tsx`

**Context:** `MODULE_META` in `NotificationsView.tsx` and `SOURCE_COLORS` in `AnnouncementsClient.tsx` both define per-module brand colors. Centralize them.

- [ ] **Step 1: Create `lib/module-colors.ts`**

```ts
/**
 * Per-module brand colors used across notification badges, announcement
 * accent bars, and other module-specific visual markers.
 */
export type ModuleKey = "CAR" | "DAR" | "KPI" | "KPI_MONTHLY" | "AUDIT";

export const MODULE_COLORS: Record<
  ModuleKey,
  { bg: string; text: string; dot: string; brand: string; label: string }
> = {
  CAR:         { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-400",  brand: "#ea580c", label: "CAR"         },
  DAR:         { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    brand: "#2563eb", label: "DAR"         },
  KPI:         { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500",   brand: "#16a34a", label: "KPI"         },
  KPI_MONTHLY: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", brand: "#059669", label: "KPI Monthly" },
  AUDIT:       { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  brand: "#7c3aed", label: "Audit"       },
};

export const FALLBACK_MODULE_COLORS = {
  bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", brand: "#64748b", label: "—",
};

/** Returns module meta or fallback for unknown modules. */
export function getModuleMeta(module: string) {
  return MODULE_COLORS[module as ModuleKey] ?? FALLBACK_MODULE_COLORS;
}

/**
 * Simplified brand-color-only map for announcement accent bars.
 * Keys: announcement sourceSystem values (QMS, IT, HR, GA, SAFETY, + module keys).
 */
export const SOURCE_BRAND_COLORS: Record<string, string> = {
  QMS:    "#0F1059",
  IT:     "#1D6A8A",
  HR:     "#7C3AED",
  GA:     "#059669",
  SAFETY: "#DC2626",
  CAR:    "#ea580c",
  DAR:    "#2563eb",
  KPI:    "#16a34a",
  AUDIT:  "#7c3aed",
};
```

- [ ] **Step 2: Update `NotificationsView.tsx`**

Remove the local `MODULE_META` and `FALLBACK_META` constants. Add import:
```ts
import { getModuleMeta } from "@/lib/module-colors";
```
Replace all `MODULE_META[x] ?? FALLBACK_META` → `getModuleMeta(x)`.

- [ ] **Step 3: Update `AnnouncementsClient.tsx`**

Remove the local `SOURCE_COLORS` constant. Add import:
```ts
import { SOURCE_BRAND_COLORS } from "@/lib/module-colors";
```
Replace `SOURCE_COLORS[a.sourceSystem] ?? "#6B7280"` → `SOURCE_BRAND_COLORS[a.sourceSystem] ?? "#6B7280"`.

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/module-colors.ts "app/(dashboard)/notifications/NotificationsView.tsx" "app/(dashboard)/announcements/AnnouncementsClient.tsx"
git commit -m "refactor: extract MODULE_COLORS and SOURCE_BRAND_COLORS to lib/module-colors.ts"
```

---

### Task 9: Fix CAR breadcrumb — replace raw SVG with Lucide `<ChevronRight>`

**Files:**
- Modify: `components/car/CarDetailClient.tsx`

- [ ] **Step 1: Read `CarDetailClient.tsx` lines 140–150**

Find the breadcrumb section:
```tsx
<nav className="flex items-center gap-2 text-sm text-slate-400">
  <Link href={listPath} className="hover:text-slate-600 transition-colors">CAR</Link>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
  <span className="font-mono font-medium text-slate-600">{car.carNo}</span>
</nav>
```

- [ ] **Step 2: Replace**

```tsx
import { ChevronRight } from "lucide-react";
```
(Add to the existing lucide-react import line)

Replace the SVG:
```tsx
<nav className="flex items-center gap-2 text-sm text-slate-400">
  <Link href={listPath} className="hover:text-slate-600 transition-colors">CAR</Link>
  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
  <span className="font-mono font-medium text-slate-600">{car.carNo}</span>
</nav>
```

- [ ] **Step 3: Commit**

```bash
git add components/car/CarDetailClient.tsx
git commit -m "fix: replace raw SVG chevron with Lucide ChevronRight in CarDetailClient"
```

---

### Task 10: Extract `OkRatioBar` to `components/shared/`

**Files:**
- Read: `components/kpi/KpiMonthlyTable.tsx` to find `OkRatioBar` definition
- Create: `components/shared/OkRatioBar.tsx`
- Modify: `components/kpi/KpiMonthlyTable.tsx` (import from shared)

- [ ] **Step 1: Read `KpiMonthlyTable.tsx` and locate `OkRatioBar`**

Find the `OkRatioBar` component definition. It renders a horizontal progress bar with Emerald fill for OK ratio and Rose fill for the remainder.

- [ ] **Step 2: Create `components/shared/OkRatioBar.tsx`**

Extract the component verbatim (do not rename props or change logic):

```tsx
interface OkRatioBarProps {
  ok: number;   // number of OK items
  total: number; // total items
}

export default function OkRatioBar({ ok, total }: OkRatioBarProps) {
  if (total === 0) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.round((ok / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-600 shrink-0">{pct}%</span>
    </div>
  );
}
```

> Adjust the exact props and JSX to match what you actually find in `KpiMonthlyTable.tsx` — copy it verbatim, do not redesign.

- [ ] **Step 3: Update `KpiMonthlyTable.tsx`**

Remove the `OkRatioBar` inline definition. Add:
```ts
import OkRatioBar from "@/components/shared/OkRatioBar";
```

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/shared/OkRatioBar.tsx components/kpi/KpiMonthlyTable.tsx
git commit -m "refactor: extract OkRatioBar to components/shared for reuse"
```

---

## Self-Review

**Spec coverage check:**

| P1/P2 item | Task |
|---|---|
| Replace `base-*` DaisyUI tokens | Tasks 4 + 5 |
| Move `SignaturePad` to shared | Task 3 |
| Add `<PageHeader>` to KPI pages | N/A — KPI clients already render PageHeader internally (confirmed in source) |
| Add `<PageHeader>` to Announcements page | Task 7 |
| Add `<PageHeader>` to Notifications page | Task 6 |
| Extract `formatDate` to `lib/format.ts` | Task 1 |
| Extract `INPUT_CLASS` to `lib/styles.ts` | Task 2 |
| Extract module color map | Task 8 |
| Extract `OkRatioBar` to shared | Task 10 |
| Convert Announcements to server component | Task 7 |
| Fix CAR breadcrumb SVG | Task 9 |

**KPI PageHeader note:** The audit flagged missing PageHeader in the server pages, but both `KpiObjectivesClient` and `KpiMonthlyClient` already import and render `<PageHeader>` themselves — no server page change is needed. This is confirmed in source.

**Placeholder scan:** All tasks have exact code. No TBDs.

**Type consistency:** `fmtDate(iso: string | null | undefined, locale?: string): string` — used consistently in Task 1. `INPUT_CLASS: string` — no type, just a constant. `SignaturePad` — same export, only path changes.

---

*Estimated effort: ~3–4 hours total across 10 tasks. Tasks 1–5 are the highest value and should be done first.*
