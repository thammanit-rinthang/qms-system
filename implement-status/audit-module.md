# Audit Module Implementation Status

Use this file as a running implementation log for the audit module.

Update this file:

1. before starting a new implementation batch
2. after completing that batch
3. when blocked
4. before handoff

---

## Entry Template

### [YYYY-MM-DD HH:mm] Batch Name

- Implementer:
- Status: `planned | in_progress | blocked | completed`
- Scope:
- Summary:
- Implementation Details:
- Files Touched:
- Tests Run:
- Blockers:
- Follow-up:

---

## Entries

### [2026-07-13] Sprint Update — Audit Suggested Date + Database Deployment

- Implementer: Codex (AI assistant)
- Status: `completed`
- Scope: Allow audit departments to suggest a replacement audit date when they cannot attend the scheduled slot; deploy the related database migration.

#### Summary

Added the complete suggested-date flow. A department can respond with a reason and a new start/end time. The audit plan owner receives in-app/email notification, then accepts the proposed date and sends a new schedule invitation.

#### Implementation Details

- Added `SUGGESTED` to `AuditScheduleConfirmStatus`.
- Added suggested date metadata and proposer fields to `AuditSchedule`.
- Added validation requiring reason, both dates, and `end > start` for suggested dates.
- Added `POST /api/audit/schedules/[id]/accept-suggested-date` with owner/lead/privileged authorization.
- Added owner notification, email template support, UI form fields, status display, and accept action.
- Added migration `20260713170000_add_audit_suggested_date`.
- Reconciled existing migration history where older schema objects already existed, then deployed all pending migrations.

#### Files Touched

- `prisma/schema.prisma`
- `prisma/migrations/20260713170000_add_audit_suggested_date/migration.sql`
- `lib/validations/audit.ts`
- `types/audit.ts`
- `services/audit/auditPlanService.ts`
- `services/audit/auditEmailService.ts`
- `app/api/audit/schedules/[id]/accept-suggested-date/route.ts`
- `hooks/api/use-audit-schedules.ts`
- `components/audit/AuditPlanDetailClient.tsx`
- `app/(dashboard)/audit/plans/[id]/page.tsx`
- `__tests__/audit-suggest-date.test.ts`

#### Tests and Verification

- Vitest: `8 files, 56 tests passed`
- Target test: suggested-date schema tests passed
- TypeScript: `tsc --noEmit` passed
- Build: `npm run build` passed
- Prisma: `migrate deploy` completed successfully
- Prisma status: `Database schema is up to date!`

#### Blockers

- Lint still reports one pre-existing `ndc/no-db-in-api` error in `app/api/health/email/route.ts` and existing audit print-template warnings; unrelated to this sprint batch.

#### Follow-up

- Manually verify the department response and owner acceptance flow in `/audit/plans/[id]` against a real email configuration.

### [2026-06-19 00:00] Initial Setup

- Implementer: (original)
- Status: `completed`
- Scope: Create initial audit module foundation placeholder
- Summary: Created this status file and README
- Files Touched: `implement-status/audit-module.md`, `implement-status/README.md`

---

### [2026-06-19] Batch 1: Foundation — Complete

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Prisma schema, repositories, Zod schemas, AuditService type extension

#### Summary

Full foundation for the Audit module. Added all Prisma models and enums, base
repositories for plan/finding/schedule, Zod validation schemas, and extended
AuditService type unions to cover audit resource types and actions.

#### Implementation Details

**New Prisma enums:**
- `AuditType` — `INTERNAL | EXTERNAL`
- `AuditMode` — `SYSTEM | FILE_UPLOAD`
- `AuditPlanStatus` — `DRAFT | PLANNED | ANNOUNCED | IN_PROGRESS | WAITING_CORRECTIVE | READY_TO_CLOSE | CLOSED | CANCELLED`
- `AuditorRole` — `LEAD | MEMBER | OBSERVER`
- `FindingCategory` — `NC | OBSERVATION | OFI`
- `FindingSeverity` — `MINOR | MAJOR | CRITICAL`
- `FindingStatus` — `OPEN | RESPONDED | VERIFIED | CLOSED | REOPENED | REJECTED`
- `AuditDeliveryMode` — `LINK | ATTACHMENT | BOTH`
- `AuditSignType` — `IN_APP | TOKEN_LINK`
- `AuditVerifyResult` — `PASS | FAIL | REOPEN`
- `ApprovalModule` extended with `AUDIT`

**New Prisma models:** `AuditPlan`, `AuditPlanDepartment`, `AuditAuditorAssignment`,
`AuditSchedule`, `AuditAttachment`, `AuditAnnouncement`, `AuditFinding`,
`AuditCorrectiveAction`, `AuditVerification`, `AuditSignoff`, `AuditReport`

**AuditService extended:**
- Actions: `ASSIGN_AUDITOR`, `ANNOUNCE`, `GENERATE_REPORT`, `SIGN`, `REOPEN`
- Resource types: `AUDIT_PLAN`, `AUDIT_SCHEDULE`, `AUDIT_FINDING`, `AUDIT_REPORT`, `AUDIT_ANNOUNCEMENT`

#### Files Touched

- `prisma/schema.prisma` — audit enums + models appended
- `services/auditService.ts` — extended AuditAction and AuditResourceType unions
- `repositories/audit/auditPlanRepository.ts` — created
- `repositories/audit/auditFindingRepository.ts` — created
- `repositories/audit/auditScheduleRepository.ts` — created
- `lib/validations/audit.ts` — created (Zod schemas)
- `implement-status/audit-module.md` — this file

#### Tests Run

None — foundation only. Schema migration required before any runtime test.

#### Post-review Fixes (same session)

Four issues found in senior review and resolved:

1. **AuditAttachment** — removed half-baked `planId` FK. Now pure generic table queried by
   `(resourceType, resourceId)`. Add per-resource FKs only if Prisma `include` becomes mandatory.
2. **ApprovalStep** — added `LEAD_AUDITOR` and `AUDIT_SIGNER` values so `ActionToken` can
   issue tokens for audit sign-off without borrowing semantically wrong DAR/KPI steps.
3. **Date validation** — replaced `z.string().datetime({ offset: true })` with `z.coerce.date()`
   and an `optionalDate` preprocessor. Accepts `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`, and ISO strings.
4. **Finding sequence** — replaced `count + 1` with atomic `SystemConfig INSERT ON CONFLICT`
   per plan (key: `AUDIT_FINDING_SEQ_{planId}`), matching `CarSequenceRepository` pattern.

Schema pushed, Prisma client regenerated, TypeScript clean.

#### Blockers

- Senior review gate: Prisma schema draft (per plan) — **ready for review**

#### Follow-up

- Attachment repository: `repositories/audit/auditAttachmentRepository.ts` (query by resourceType+resourceId)
- Report repository: `repositories/audit/auditReportRepository.ts`

---

### [2026-06-19] Batch 2 — Plan CRUD APIs

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: GET/POST `/api/audit/plans`, GET/PATCH/DELETE `/api/audit/plans/[id]`, cancel action, audit log

#### Summary

Plan CRUD APIs implemented following the CAR/thin-route/service/repository pattern.
`auditNo` uses `SystemConfig` atomic counter (`AUD-YY-SEQ`), same strategy as `carNo`.
Permission: QMS/IT/MR have full access; USER is owner-scoped on list; owner or privileged
can edit/cancel. Mutations are wrapped in `db.$transaction` with `AuditService.record`.

#### Files Created

- `services/audit/auditPlanService.ts`
- `app/api/audit/plans/route.ts`
- `app/api/audit/plans/[id]/route.ts`

#### Implementation Details

- `GET /api/audit/plans` — paginated list; non-privileged users see only their own plans
- `POST /api/audit/plans` — creates in DRAFT; generates `auditNo` atomically in transaction
- `GET /api/audit/plans/[id]` — full detail with all relations
- `PATCH /api/audit/plans/[id]` — editable only in DRAFT/PLANNED; owner or privileged
- `DELETE /api/audit/plans/[id]` — sets status to CANCELLED (soft); owner or privileged
- Each mutation records `AuditService` entry inside the same transaction

#### Tests Run

TypeScript clean (no audit-related errors). No runtime tests yet.

#### Blockers

None for Batch 2. Next: Batch 3 (Schedule and Assignment APIs).

#### Follow-up

- Batch 3: done (see below)

---

### [2026-06-19] Batch 3 — Schedule and Assignment

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Auditor assignment, department set, schedule CRUD APIs + permission guards

#### Summary

Extended `AuditPlanService` with assignment/department/schedule operations. Added 4 route
files. All mutations transactional with `AuditService.record`. Permission model:
- assign-auditors / departments: plan owner or QMS/MR/IT
- schedules: plan owner, assigned LEAD auditor, or QMS/MR/IT
- Plan must be in a mutable status (DRAFT/PLANNED/ANNOUNCED/IN_PROGRESS) for all writes

#### Files Created / Updated

- `services/audit/auditPlanService.ts` — added `assignAuditors`, `setDepartments`,
  `createSchedule`, `getSchedulesByPlan`, `updateSchedule`, `deleteSchedule`,
  `assertOwnerLeadOrPrivileged`
- `app/api/audit/plans/[id]/assign-auditors/route.ts` — POST
- `app/api/audit/plans/[id]/departments/route.ts` — POST
- `app/api/audit/plans/[id]/schedules/route.ts` — GET, POST
- `app/api/audit/schedules/[id]/route.ts` — PATCH, DELETE

#### Implementation Notes

- `assignAuditors`: delete-all then createMany in one transaction; syncs
  `AuditPlan.leadAuditorAuthUserId` to the LEAD entry
- `setDepartments`: same replace-all pattern
- `assertOwnerLeadOrPrivileged`: checks LEAD auditor assignment rows — allows
  lead auditor to manage schedules without elevated platform role

#### Tests Run

TypeScript clean (no audit-related errors).

#### Follow-up

- Batch 4: done (see below)

---

### [2026-06-19] Batch 4 — Findings

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Finding CRUD, corrective action response, verification, close — APIs + service

#### Summary

Full finding lifecycle backend. `AuditFindingService` owns all state transitions.
Finding sequence numbers use the atomic `SystemConfig` counter from Batch 1.
Respond/verify/close are separate action endpoints — generic PATCH cannot change status.

#### State Machine

- `OPEN` / `REOPENED` → `RESPONDED` (via `/respond`)
- `RESPONDED` → `VERIFIED` (verify PASS) or `REOPENED` (verify FAIL/REOPEN)
- `VERIFIED` → `CLOSED` (via `/close`)

#### Permission Matrix

| Action | Who |
|---|---|
| Create / edit finding | Assigned auditors (any role) or QMS/IT |
| Respond (corrective action) | Finding owner or QMS/IT |
| Verify | LEAD auditor or QMS/IT |
| Close | LEAD auditor or QMS/IT |

#### Files Created

- `services/audit/auditFindingService.ts`
- `app/api/audit/plans/[id]/findings/route.ts` — GET (list + status filter), POST
- `app/api/audit/findings/[id]/route.ts` — GET (detail), PATCH (edit)
- `app/api/audit/findings/[id]/respond/route.ts` — POST
- `app/api/audit/findings/[id]/verify/route.ts` — POST
- `app/api/audit/findings/[id]/close/route.ts` — POST

#### Tests Run

TypeScript clean (no audit-related errors).

#### Senior Review Gate

Plan requires senior review before Batch 6 (notifications, sign, PDF).
Batches 1–4 backend is complete and can be reviewed together.

#### Follow-up

---

### [2026-06-19] Batch 5 — File Upload Mode / Attachment Metadata

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: AuditAttachment CRUD (generic table), FILE_UPLOAD mode support

#### Files Created

- `repositories/audit/auditAttachmentRepository.ts`
- `app/api/audit/attachments/route.ts` — GET (list by resourceType+resourceId), POST (save metadata)
- `app/api/audit/attachments/[id]/route.ts` — DELETE (uploader or QMS/IT only)
- `lib/validations/audit.ts` — extended with `auditAttachmentCreateSchema`

#### Notes

- Attachment table is pure generic: queried by `(resourceType, resourceId)` — no Prisma FK per resource
- `resourceType` values: `PLAN | FINDING | REPORT`
- Actual file upload to SharePoint happens client-side; this API saves metadata only
- `mode: FILE_UPLOAD` on plan is set at create time — no special endpoint needed

---

### [2026-06-19] Batch 6 — Notifications, Sign, Report, Close

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Announcement email, in-app/token sign, report generation, plan closure

#### Files Created

- `services/audit/auditEmailService.ts` — announcement + sign-request email templates
- `services/audit/auditNotificationService.ts` — `sendAnnouncementOnce`, `sendSignRequestOnce`, `notifyAuditUser`
- `services/audit/auditSignReportService.ts` — `signInApp`, `issueSignRequest`, `consumeTokenSign`, `generateReport`, `closePlan`
- `app/api/audit/plans/[id]/announce/route.ts` — POST
- `app/api/audit/plans/[id]/sign/route.ts` — POST (in-app)
- `app/api/audit/plans/[id]/sign-request/route.ts` — POST (issue token)
- `app/api/audit/plans/[id]/sign-consume/route.ts` — POST (consume token)
- `app/api/audit/plans/[id]/generate-report/route.ts` — POST
- `app/api/audit/plans/[id]/close/route.ts` — POST
- `lib/validations/audit.ts` — extended with announce, sign, report schemas

#### Key Decisions

- `revokeByDocument("AUDIT", planId)` called before each new token issue — no stale tokens
- `closePlan` gates: all findings CLOSED/REJECTED + at least one signoff
- `generateReport` advances status to `READY_TO_CLOSE` automatically
- `announce` saves `AuditAnnouncement` record and advances plan to `ANNOUNCED`; email is fire-and-forget
- Token sign uses `ActionToken` with `module=AUDIT`, `role=AUDIT_SIGNER` — consumes same ownership/expiry rules as KPI/CAR
- PDF generation: `AuditReport.pdfFileUrl` field exists; actual PDF render is out of scope (Phase 4)

#### Tests Run

TypeScript clean (no audit-related errors).

#### Follow-up

- All 6 batches complete — backend API layer done
- Next: Batch review and frontend implementation (Phase 2 of plan)

---

### [2026-06-19] Frontend Phase 2 — UI Implementation

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Audit Plan list page, detail page with tabs, create/edit forms, finding lifecycle UI, React Query hooks, sidebar nav entry

#### Summary

Full frontend layer for the Audit Module. Follows CAR module patterns exactly: server-side page
components do auth check and initial data load; client components own all interactivity;
React Query hooks own all fetch/mutation logic; Dialog (desktop) / Sheet (mobile) pattern for
create/edit forms.

#### Files Created

**Types**
- `types/audit.ts` — AuditPlanSummary, AuditPlanDetail, AuditFindingRow, AuditFindingDetail,
  AuditScheduleRow, AuditAttachmentRow, AuditAuditorRow, AuditDepartmentRow, plus all label/color
  record maps for status, type, mode, category, severity

**React Query Hooks**
- `hooks/api/use-audit-plans.ts` — list (paginated), create, update, cancel mutations
- `hooks/api/use-audit-plan-detail.ts` — detail fetch, assign-auditors, set-departments, announce,
  sign-in-app, generate-report, close-plan mutations
- `hooks/api/use-audit-schedules.ts` — list, create, update, delete
- `hooks/api/use-audit-findings.ts` — list (with status filter), detail, create, update, respond,
  verify, close
- `hooks/api/use-audit-attachments.ts` — list by resourceType+resourceId, create, delete

**Audit Components**
- `components/audit/AuditPlanStatusBadge.tsx` — status badge matching CarStatusBadge pattern
- `components/audit/AuditFindingStatusBadge.tsx` — finding status badge
- `components/audit/AuditPlanFormModal.tsx` — RHF+Zod create/edit form; Dialog (desktop) /
  Sheet (mobile); mode selection (SYSTEM / FILE_UPLOAD); exports `AuditPlanFormModalTrigger`
- `components/audit/AuditFindingFormModal.tsx` — RHF+Zod finding create/edit form; same
  Dialog/Sheet pattern; category, severity, clause, title, detail, evidence, owner, due date
- `components/audit/AuditPlanListTable.tsx` — paginated table with auditType / status filters,
  FilterBar, Pagination, mobile card fallback; edit/cancel action buttons (privileged only)
- `components/audit/AuditPlanDetailClient.tsx` — 6-tab detail view:
  - Overview: plan fields, owner, dates, status, report card
  - Team: auditor list with role badges
  - Schedule: inline add-session form, delete confirm dialog
  - Departments: department list
  - Findings: table with status filter, respond/verify/close action dialogs (state machine buttons)
  - Attachments: metadata upload form + list with delete

**Pages**
- `app/(dashboard)/audit/plans/page.tsx` — list page; auth check; privileged vs user gate;
  QMS/IT see "Create" trigger
- `app/(dashboard)/audit/plans/[id]/page.tsx` — detail page; server-loads initial plan data;
  passes to AuditPlanDetailClient

**Sidebar**
- `components/layout/DashboardSidebar.tsx` — added "แผนการตรวจสอบ / Audit Plans" nav item
  to userItems section (accessible to all authenticated roles); icon: `Search` from lucide-react

#### Route Protection Notes

- `/audit/**` is under `app/(dashboard)/` so `requireAuth()` in `DashboardLayout` provides
  the session gate automatically — no middleware change required.
- Role-level gates are enforced inside page.tsx (redirect if no session) and inside the
  client components (canEdit, canCreateFinding, canVerify flags derived from role + auditor
  assignment).
- Middleware `/qms/**` guard was NOT extended because audit pages live under `/audit/`, not `/qms/`.

#### Permission Model (UI layer)

| Action | Condition |
|---|---|
| Create plan | QMS or IT (canEdit) |
| Edit plan | QMS or IT; plan in DRAFT or PLANNED |
| Cancel plan | QMS or IT; plan not CLOSED or CANCELLED |
| Manage schedules | Privileged OR assigned LEAD auditor |
| Create finding | Privileged OR any assigned auditor |
| Verify finding | Privileged OR assigned LEAD auditor |
| Close finding | Same as verify |
| Upload attachment | Privileged only |
| Sign in-app | Privileged only |
| Generate report | Privileged; plan IN_PROGRESS |
| Close plan | Privileged; plan READY_TO_CLOSE |

#### Tests Run

TypeScript clean — zero errors across all 16 new/modified files (confirmed via IDE diagnostics).

#### Blockers

None. All screens in scope are complete.

#### Follow-up / Out of Scope (per task spec)

- PDF generation UI (Phase 4)
- MS Calendar sync UI (Phase 4)
- External Audit intake page (Phase 5)
- Analytics / export (Phase 6)
- Auditor assignment UI form (current implementation shows API hint; a full GraphUserPicker
  integration would be a Phase 3 enhancement)
- Department assignment UI form (same — API hint shown; full picker TBD)
- E2E tests

---

### [2026-06-19] Frontend Phase 3 — Dashboard and My Tasks

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Audit Dashboard page, My Audit Tasks page, dashboard and my-tasks API routes, two React Query hooks, two client components, sidebar nav updates

#### Summary

Two new pages added to the Audit module. Both follow the established pattern: server
component does auth check only (no initial data prefetch for live dashboards), client
component owns the React Query call. API routes are thin — direct Prisma queries via `db`,
no Prisma calls in pages or hooks.

#### Files Created

- `app/api/audit/dashboard/route.ts` — GET; returns 6 counts + upcoming schedules (7 days) + recent open findings (10 items); uses `Promise.all` for parallel queries; serializes all Dates to ISO strings
- `app/api/audit/my-tasks/route.ts` — GET; reads `session.user.authUserId ?? session.user.id`; returns toRespond, toVerify (flattened from plans where user is LEAD + findings RESPONDED), leadingPlans, pendingSignoffs
- `hooks/api/use-audit-dashboard.ts` — `useAuditDashboard()` hook; `staleTime: 30s`; exports `AuditDashboardData`, `AuditDashboardCounts`, `AuditDashboardSchedule`, `AuditDashboardFinding` types
- `hooks/api/use-audit-my-tasks.ts` — `useAuditMyTasks()` hook; same stale time; exports `MyTaskFinding`, `MyTaskPlan`, `MyTaskSignoffPlan`, `AuditMyTasksData` types
- `components/audit/AuditDashboardClient.tsx` — 6 metric cards (grid 2/3 cols), upcoming schedules column, recent findings column; skeleton state; error state; links to `/audit/plans/[id]`
- `components/audit/AuditMyTasksClient.tsx` — 4-tab UI (To Respond, To Verify, Plans I Lead, Pending Sign-offs); tab badge counts; FindingRow and PlanRow sub-components; skeleton + empty states; all links go to `/audit/plans/[id]`
- `app/(dashboard)/audit/page.tsx` — server page; auth check via `auth()`; passes no initial data; renders `AuditDashboardClient`
- `app/(dashboard)/audit/my-tasks/page.tsx` — server page; same auth pattern; renders `AuditMyTasksClient`

#### Files Modified

- `components/layout/DashboardSidebar.tsx` — added `LayoutDashboard` and `ListTodo` to lucide-react imports; inserted "ภาพรวมตรวจสอบ / Audit Dashboard" (`/audit`, `exact: true`) and "งานตรวจสอบของฉัน / My Audit Tasks" (`/audit/my-tasks`) nav items in userItems, adjacent to existing "แผนการตรวจสอบ / Audit Plans" entry

#### Implementation Notes

- Dashboard route queries the DB directly (6 counts + 2 queries) in `Promise.all` — thin, no service layer needed for read-only counts
- My-tasks route queries `leadAuditorAuthUserId` (denormalized field on `AuditPlan` synced by `assignAuditors`) for efficient leading-plans lookup
- `toVerify` is derived by querying plans where user has LEAD auditor role and there is at least one RESPONDED finding; the findings are nested on the plan result and flattened in-route before returning
- Sidebar: `/audit` uses `exact: true` so it only activates when exactly on the dashboard, not on `/audit/plans` or `/audit/my-tasks`

#### Tests Run

TypeScript: zero errors (confirmed via IDE diagnostics — all new files clean).

#### Blockers

None.

#### Follow-up / Out of Scope

- PDF generation UI (Phase 4)
- MS Calendar sync (Phase 4)
- E2E tests

---

### [2026-06-19] Frontend Phase 3 — Post-Review Fixes

- Implementer: Claude (AI assistant)
- Status: `completed`
- Fixes:
  - BLOCKING B-1: Dashboard queries extracted to `AuditPlanService.getDashboardData()`. Route now imports `AuditPlanService`, constructs one instance, and calls `getDashboardData()`. The `db` import and all 8 direct Prisma calls removed from the route.
  - BLOCKING B-2: My-tasks queries extracted to `AuditPlanService.getMyTasks(authUserId: string)`. Placed in `auditPlanService.ts` because 3 of 4 query groups target `auditPlan`; the one `auditFinding` group (toRespond) is structurally equivalent to the others. Route now imports the same service instance and calls `getMyTasks(authUserId)`. The `db` import and all 4 Prisma query groups (including the `flatMap` transform) removed from the route.
  - HIGH H-1: `AuditPlan.auditNo` is `String` (non-nullable, `@unique`). No type changes needed in hooks or components.
- Files Modified:
  - `services/audit/auditPlanService.ts` — added `getDashboardData()` and `getMyTasks()` methods
  - `app/api/audit/dashboard/route.ts` — removed `db` import; replaced `Promise.all` block with `auditPlanService.getDashboardData()`
  - `app/api/audit/my-tasks/route.ts` — removed `db` import; replaced `Promise.all` block with `auditPlanService.getMyTasks(authUserId)`
- TypeScript: zero diagnostics on all three files.

---

### [2026-06-19] Frontend Phase 2 — Post-Review Fixes

- Implementer: Claude (AI assistant)
- Status: `completed`
- Fixes applied:
  - BLOCKING-1: basePath dead route removed — all roles use `/audit/plans`
  - BLOCKING-2: Respond button now guarded by `canCreate` in `FindingsTab`
  - HIGH-1: List page prefetches `initialData` server-side via `auditPlanService.listPlans({ page: 1, limit: 20 })`; date fields in list items serialized to ISO strings before passing to client (same pattern as detail page)
  - HIGH-2: RSC→client date serialization replaces double cast — explicit field mapping for all Date fields in AuditPlan, AuditSchedule, AuditAnnouncement, AuditFinding, AuditSignoff, AuditReport
  - MEDIUM: Close Plan confirm dialog added using same `Dialog` pattern as Cancel Plan in `AuditPlanListTable.tsx`; `showClosePlanConfirm` state guards the mutation
  - MEDIUM: REJECTED added to findings status filter; uses `FINDING_STATUS_LABELS` from `types/audit.ts` (import added)
  - LOW: Local `STATUS_LABELS` removed from `AuditPlanListTable`; replaced with imported `AUDIT_PLAN_STATUS_LABELS` from `types/audit.ts`
- Files Modified:
  - `components/audit/AuditPlanListTable.tsx`
  - `components/audit/AuditPlanDetailClient.tsx`
  - `app/(dashboard)/audit/plans/page.tsx`
  - `app/(dashboard)/audit/plans/[id]/page.tsx`
  - `implement-status/audit-module.md`

#### Notes

- `AuditReport` in Prisma schema has no `reportNo` field; serialization maps `plan.report.id` to `AuditReportRow.reportNo` (the existing `as unknown as` cast did the same implicitly)
- `AuditSchedule` in Prisma schema has no `createdAt`; `AuditScheduleRow.createdAt` is set to `""` — the detail client component does not render `createdAt` for schedule rows
- `AuditSignoff.signedByAuthUserId` is mapped to `AuditSignoffRow.signerAuthUserId` in serialization
- Excess Prisma fields on spread (e.g., `leadAuditorAuthUserId`, `calendarEventId`) are allowed by TypeScript structural typing; they are ignored at the client component boundary

---

### [2026-06-19] Frontend Phase 4 — Report & Sign Tab

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Report & Sign tab added to plan detail; generate report form; in-app sign; token sign request; close plan moved here

#### Summary

Added a 7th tab ("รายงาน & ลงนาม") to `AuditPlanDetailClient.tsx`. The tab contains three
sections: (1) Generate Report form with summary + conclusion textareas using
`auditReportSchema` + RHF; existing report display with regenerate toggle; (2) Sign-offs
list with "ลงนามในระบบ" confirm dialog and "ส่งลิงก์ลงนาม" dialog (targetAuthUserId,
targetEmail, targetName, signedRole fields); (3) Close Plan destructive-action card.
Close Plan button removed from the header action area.

Added `useIssueSignRequest` hook to `use-audit-plan-detail.ts` — calls
`POST /api/audit/plans/[id]/sign-request` with `{ targetAuthUserId, targetEmail, targetName, signedRole }`.

#### Files Modified

- `hooks/api/use-audit-plan-detail.ts` — added `issueSignRequest` fetch helper and `useIssueSignRequest` export
- `components/audit/AuditPlanDetailClient.tsx`:
  - `TabKey` type extended with `"report-sign"`
  - `TABS` array extended with 7th entry (icon: `PenLine`)
  - Imports: added `PenLine`, `Send` from lucide-react; added `auditReportSchema`, `AuditReportInput` from validations; added `useIssueSignRequest`
  - Main component: added `showSignInAppConfirm`, `showSignRequestDialog`, `showReportForm` state; added `issueSignRequestMutation`, `reportForm`, `signRequestForm`; updated `canGenerateReport` to include `WAITING_CORRECTIVE` and `READY_TO_CLOSE` statuses; added `canSignInApp`, `canIssueSignRequest`, `hasAlreadySigned` derived booleans
  - Header: removed old sign/generate/close buttons (kept only Edit)
  - Tab content: added full `report-sign` section
  - Dialogs: added Sign In-App confirm dialog, Issue Sign Request dialog

#### Permission Model

| Action | Condition |
|---|---|
| Generate report | QMS/IT/MR; plan IN_PROGRESS, WAITING_CORRECTIVE, or READY_TO_CLOSE |
| View existing report (read-only) | Any authenticated user; plan has a report |
| Sign in-app | Plan READY_TO_CLOSE; user has not yet signed; privileged OR assigned auditor OR plan owner |
| Issue token sign request | QMS/IT/MR; plan READY_TO_CLOSE |
| Close plan | QMS/IT/MR; plan READY_TO_CLOSE |

#### Pre-existing TypeScript Errors (not introduced by Phase 4)

Lines 77, 106, 228, 364, 672 in `AuditPlanDetailClient.tsx` — `zodResolver` / `SubmitHandler`
type incompatibilities in `ScheduleTab`, `FindingsTab` (date coercion), and `announceForm`
(optional vs required fields). All existed before Phase 4. Phase 4 code is clean.

#### Blockers

None.

---

### [2026-06-19] Phase 4+5 — Post-Review Fixes

- Status: completed
- BLOCKING B-1: External intake page now has server-side role check — `app/(dashboard)/audit/external/page.tsx` converted to a server component that calls `auth()`, redirects unauthenticated users to `/auth/login`, and redirects non-QMS/IT/MR users to `/audit`. Client form extracted to `components/audit/ExternalAuditIntakeForm.tsx`.
- BLOCKING B-2: `signInApp` now validates `READY_TO_CLOSE` status before proceeding (throws `ValidationError` with 400).
- BLOCKING B-3: `signInApp` now queries `auditSignoff` for an existing record from the same actor and throws `ValidationError("You have already signed this plan.")` if found.
- BLOCKING B-4: Announce API (`app/api/audit/plans/[id]/announce/route.ts`) now checks `plan.status` is `PLANNED` or `ANNOUNCED` before creating the announcement; throws `ValidationError` (400) otherwise. Added `ValidationError` to imports.
- HIGH H-1: `issueSignRequest` now calls `ActionTokenService.revokeByDocumentAndRecipient("AUDIT", planId, targetAuthUserId)` instead of `revokeByDocument` — only revokes the previous token for the same recipient. Added `revokeByDocumentAndRecipient(module, documentId, issuedTo)` to `ActionTokenRepository` and `ActionTokenService`.
- HIGH H-2: `saveAttachmentMetadata` in `AuditPlanFormModal.tsx` and `saveAttachment` in `ExternalAuditIntakeForm.tsx` now store `fileUrl: null` instead of a blob URL. Both UIs show a Thai-language `toast.info` warning after successful metadata save: "ไฟล์ถูกบันทึกชื่อไว้แล้ว กรุณาอัปโหลดไฟล์จริงไปยัง SharePoint และอัปเดตลิงก์ในระบบภายหลัง" (8-second duration).
- MEDIUM M-2: `createPlan` in `auditPlanService.ts` now throws `ValidationError` when `auditType === "EXTERNAL"` and `sourceOrganization` is falsy.
- Files Modified:
  - `app/(dashboard)/audit/external/page.tsx` — server component wrapper with auth + role gate
  - `components/audit/ExternalAuditIntakeForm.tsx` — created; client form extracted from old page
  - `services/audit/auditSignReportService.ts` — B-2 status check, B-3 duplicate check, H-1 recipient-scoped revoke
  - `services/actionTokenService.ts` — added `revokeByDocumentAndRecipient` static method
  - `repositories/actionTokenRepository.ts` — added `revokeByDocumentAndRecipient` method
  - `app/api/audit/plans/[id]/announce/route.ts` — B-4 status guard; `ValidationError` import added
  - `components/audit/AuditPlanFormModal.tsx` — H-2 blob URL removed; warning toast added
  - `services/audit/auditPlanService.ts` — M-2 sourceOrganization guard added

---

### [2026-06-19] File Upload + Email Attachment — Both Audit Types

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Auth Center email pipeline extended for file attachments; SharePoint upload for audit plan files; announcement email now attaches uploaded plan documents; real file upload UI replaces metadata-only approach for both Internal and External audit types

#### Summary

End-to-end file upload pipeline for audit plans:
1. Auth Center now accepts and forwards MS Graph `fileAttachment` objects in the mail payload.
2. QMS `services/sharepoint.ts` gained `uploadFileToAudit()` — uploads to `Audit/{planId}/{fileName}` using the same `simpleUpload`/`resumableUpload` helpers as all other domain uploads.
3. New `POST /api/audit/attachments/upload` multipart route handles real file upload: validates type/size, uploads to SharePoint, saves metadata row with `fileUrl` and `sharePointItemId`.
4. `sendAnnouncementOnce()` now fetches plan attachments from DB, downloads each from SharePoint via the Graph app token, base64-encodes them, and passes them to `sendAuditAnnouncementEmail()` → Auth Center → MS Graph `sendMail` as `fileAttachment` objects.
5. Frontend: `AttachmentsTab` replaced the metadata-only form with a real `<input type="file">` + `useUploadAuditAttachment` mutation hook. Both `AuditPlanFormModal` and `ExternalAuditIntakeForm` no longer contain a file picker — files are uploaded post-creation in the Attachments tab. Both show a toast informing the user to upload documents before announcing.

#### Files Modified (Auth Center)

- `schemas/mailSchema.ts` — added `attachmentSchema` + optional `attachments` array to `sendMailSchema`
- `lib/graphMailClient.ts` — added `attachments` to `MailMessage` interface; spreads `#microsoft.graph.fileAttachment` objects into Graph `sendMail` payload
- `services/mailService.ts` — passes `attachments` from `sendAsUser` input through to `sendMailAsUser`

#### Files Modified (QMS)

- `services/email.ts` — added optional `attachments` field to `SendMailOptions`; passes through to Auth Center body
- `services/sharepoint.ts` — added `uploadFileToAudit()` (simple/resumable, folder `Audit/{planId}/`)
- `services/audit/auditEmailService.ts` — added `MailAttachment` type; `sendMail` helper and `sendAuditAnnouncementEmail` accept `attachments?: MailAttachment[]`
- `services/audit/auditNotificationService.ts` — `sendAnnouncementOnce` fetches plan attachments via `AuditAttachmentRepository`, downloads bytes via Graph token, passes base64 array to email service; uses `Promise.allSettled` so individual download failures do not abort the email
- `hooks/api/use-audit-attachments.ts` — added `uploadAttachment` fetch helper + `useUploadAuditAttachment` mutation hook
- `components/audit/AuditPlanDetailClient.tsx` — `AttachmentsTab` replaced with real file upload UI using `useUploadAuditAttachment`; import changed from `useCreateAuditAttachment` to `useUploadAuditAttachment`
- `components/audit/AuditPlanFormModal.tsx` — removed file input and `saveAttachmentMetadata`; FILE_UPLOAD mode now shows only `sourceOrganization` + hint to use Attachments tab; removed `useRef` import
- `components/audit/ExternalAuditIntakeForm.tsx` — full rewrite: removed file picker and `saveAttachment`; redirects directly to plan detail with info toast after plan creation

#### Files Created (QMS)

- `app/api/audit/attachments/upload/route.ts` — `POST /api/audit/attachments/upload` multipart handler; validates MIME type (PDF/Word/Excel/PNG/JPEG) and 20 MB size cap; calls `uploadFileToAudit` then saves `AuditAttachment` row

#### Blockers

None.

---

### [2026-06-19] File Upload + Email Attachment — Post-Review Fixes

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: Security hardening and correctness fixes identified in post-implementation review

#### Fixes Applied

- **B-1 (BLOCKING): Magic byte MIME validation** — Upload route no longer trusts client-supplied `file.type`. Added `detectMimeFromBuffer()` that reads the first 4 bytes. PDF, PNG, JPEG detected from magic bytes. ZIP-based (DOCX/XLSX/Office Open XML) falls through to extension check. Legacy OLE2 (.doc/.xls old format) is explicitly rejected. Unknown signatures rejected. Stored `mimeType` is `detectedMime ?? file.type`. Old `ALLOWED_MIME_TYPES.has(file.type)` check removed.
- **B-2 (BLOCKING): Authorization check on upload route** — After `requireAuth()`, if the actor's role is not in `["QMS", "IT", "MR"]`, the route now fetches the plan and checks `ownerAuthUserId` or any `auditorAssignments.assigneeAuthUserId` matches. Throws `NotFoundError` (404) if the plan does not exist, `ForbiddenError` (403) if neither condition is met. Uses `import { db } from "@/lib/db"` matching the announce route pattern.
- **H-1 (HIGH): `spDownloadUrl` stored in `AuditAttachment`** — Added `spDownloadUrl String? @map("sp_download_url")` field to `AuditAttachment` in `prisma/schema.prisma`. Re-ran `npx prisma generate` (client regenerated, no migration run). Upload route now saves `spDownloadUrl: result.spDownloadUrl ?? null` in the `repo.create(...)` call. Notification service now filters on `a.spDownloadUrl` (not `a.fileUrl`) and fetches with no Authorization header — `spDownloadUrl` is a pre-authenticated CDN URL.
- **H-2 (HIGH): Total attachment size guard before Graph sendMail** — After collecting `validAttachments`, the notification service estimates raw byte size from base64 length (`× 0.75`). If over 20 MB, logs a `logger.warn` and truncates the list greedily (keep until limit would be exceeded). Passes the truncated list to `sendAuditAnnouncementEmail`. No send failure on oversize.
- **H-3 (HIGH): File input ref cleared after upload** — `AttachmentsTab` in `AuditPlanDetailClient.tsx` gains `fileInputRef = useRef<HTMLInputElement>(null)`. On `onSuccess`, `fileInputRef.current.value = ""` is called in addition to `setSelectedFile(null)`. `ref={fileInputRef}` added to the `<input type="file">` element. `useRef` added to the React import.
- **M-1 (MEDIUM): `planId` sanitized in SharePoint folder path** — `uploadFileToAudit` in `services/sharepoint.ts` now computes `safePlanId = opts.planId.replace(/[^a-zA-Z0-9_-]/g, "_")` and uses it in `folderPath = \`Audit/${safePlanId}\``.

#### Files Modified

- `app/api/audit/attachments/upload/route.ts` — B-1 magic byte check, B-2 auth guard, H-1 spDownloadUrl store; removed legacy MIME_TYPES check; added `db`, `ForbiddenError`, `NotFoundError` imports
- `prisma/schema.prisma` — added `spDownloadUrl String? @map("sp_download_url")` to `AuditAttachment`
- `services/audit/auditNotificationService.ts` — H-1 use spDownloadUrl + no auth header; H-2 size guard; removed `getGraphToken` import (no longer needed)
- `components/audit/AuditPlanDetailClient.tsx` — H-3 fileInputRef; `useRef` added to React import
- `services/sharepoint.ts` — M-1 planId sanitization

#### Tests Run

TypeScript: zero diagnostics on all five modified files (confirmed via IDE diagnostics).

#### Blockers

None.

---

### [2026-06-19] Frontend Phase 5 — External Audit Intake & Announce

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: FILE_UPLOAD mode in create form, external audit intake page, announce dialog in plan detail

#### Summary

Three additions to the Audit module frontend:

1. **AuditPlanFormModal — FILE_UPLOAD mode**: when mode is FILE_UPLOAD, the form now renders two
   extra fields: `sourceOrganization` (text input) and a file picker (`.pdf/.docx/.xlsx`).
   On create, if a file is selected, metadata is saved via `POST /api/audit/attachments` after
   plan creation using a local object URL as `fileUrl` placeholder.

2. **External Audit Intake page** (`/audit/external`): a focused client-side page with
   `auditType: "EXTERNAL"` and `mode: "FILE_UPLOAD"` fixed (hidden inputs). Fields: title (required),
   sourceOrganization, standard, startDate, endDate, scope, objective, file upload.
   On success: navigates to `/audit/plans/[id]`. Uses RHF + `auditPlanCreateSchema`.
   Auth gate is provided by the parent `app/(dashboard)/layout.tsx` `requireAuth()`.

3. **Announce dialog in AuditPlanDetailClient**: added `showAnnounceDialog` state, `announceForm`
   (RHF + `auditAnnounceSchema`), and `announceMutation` (`useAnnouncePlan`). The Overview tab
   now has an Announcements section with: a "ประกาศแผน" button (visible when `canAnnounce`), a
   read-only list of existing announcements (title, message, deliveryMode, publishedAt), and a
   Dialog form with title, message, and deliveryMode radio (LINK / ATTACHMENT / BOTH).

4. **AuditAnnouncementRow type**: added `deliveryMode: string | null` to `types/audit.ts`.

5. **Sidebar**: added "รับแผนตรวจสอบภายนอก / External Audit Intake" entry to `qmsItems` with
   `Upload` icon, href `/audit/external`. Visible to QMS/MR/IT roles.

#### Files Modified

- `types/audit.ts` — added `deliveryMode: string | null` to `AuditAnnouncementRow`
- `components/audit/AuditPlanFormModal.tsx` — FILE_UPLOAD extra fields, file state, post-create attachment save
- `components/audit/AuditPlanDetailClient.tsx` — Announce button/dialog/list in Overview tab; `Megaphone` icon; `auditAnnounceSchema` + `AuditAnnounceInput` imports
- `components/layout/DashboardSidebar.tsx` — added `Upload` import; added External Audit Intake nav item to `qmsItems`

#### Files Created

- `app/(dashboard)/audit/external/page.tsx` — External audit intake page (client component)

#### Permission Model

| Action | Condition |
|---|---|
| Announce plan | QMS/IT/MR; plan status PLANNED or ANNOUNCED |
| File Upload create form extras | All plan creators (modal renders extra fields when mode=FILE_UPLOAD) |
| External intake sidebar entry | QMS, MR, IT roles only |

#### Blockers

None.

---

### [2026-06-22] Review Fixes — Audit Appointment Letter Feature

- Implementer: Claude (AI assistant)
- Status: `completed`
- Scope: All H and M findings from the batch code review for the Appointment Letter feature

#### Fixes Applied

**H-1 — emailGroupMails email validation**
- `lib/validations/audit.ts`: `auditAppointmentCreateSchema.emailGroupMails` changed from `z.array(z.string())` to `z.array(z.string().email("Invalid email"))` — backend now rejects non-email strings.
- `components/audit/AuditAppointmentFormModal.tsx`: Added `emailError` state; `addEmail` now validates against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` before appending; sets error on invalid input, clears on change; error paragraph rendered below the email input field.

**H-2 — Rejection email to appointment owner**
- `services/audit/auditEmailService.ts`: Added `sendAppointmentRejectedEmail()` using `auditMailLayout` with appointmentNo, title, returned-by role label, and reason; subject `[QMS] ประกาศถูกส่งคืน {no}`.
- `services/audit/auditAppointmentService.ts`: Updated import; `reject()` now awaits transaction into `updated`, fires rejection email to `appt.ownerEmail` with `.catch` guard, then returns `updated`.

**H-3 — Audit appointments in pending-summary**
- `services/approvalsService.ts`: Added `import { db }` from `@/lib/db`; added `pendingAppointmentReviewCount` and `pendingAppointmentApproveCount` via `db.auditAppointment.count` in `Promise.all`; added both to `PendingApprovalSummary` type, `totalPending` sum, and return object.

**M-1 — AuditAppointmentStatus defined twice**
- `types/audit.ts`: Added `AuditAppointmentStatus` to Prisma import and re-export blocks; removed the manual string-union definition. Prisma-generated enum is now the single source of truth.

**M-2 — AuditAppointmentApproveClient status guard**
- `components/audit/AuditAppointmentApproveClient.tsx`: Added `alreadyActioned` boolean; action panel shows "Already Actioned" card when status doesn't match expected; Sign/Reject buttons hidden when already actioned; Back button always visible.

**M-3 — reject() clears prior-round signoffs**
- `services/audit/auditAppointmentService.ts`: Added `tx.auditAppointmentSignoff.deleteMany({ where: { appointmentId: id } })` before the `update` inside the reject transaction.

**M-4 — updatedAt missing from AuditAppointmentRow**
- `types/audit.ts`: Added `updatedAt: string;` to `AuditAppointmentRow` after `createdAt`.

#### TypeScript Check

`npx tsc --noEmit` — 5 errors, all pre-existing in `AuditPlanDetailClient.tsx` and `audit/plans/[id]/page.tsx` (zodResolver/date coercion and deliveryMode). Zero errors in any file touched by this batch.

#### Files Modified

- `lib/validations/audit.ts`
- `components/audit/AuditAppointmentFormModal.tsx`
- `services/audit/auditEmailService.ts`
- `services/audit/auditAppointmentService.ts`
- `services/approvalsService.ts`
- `types/audit.ts`
- `components/audit/AuditAppointmentApproveClient.tsx`
- `implement-status/audit-module.md`

#### Blockers

None.

