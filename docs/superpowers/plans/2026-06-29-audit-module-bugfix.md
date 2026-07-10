# Audit Module Bug Fix & Flow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all confirmed bugs in the Audit module — dashboard data mismatch, unhandled promise rejections in notification flow, SharePoint upload validation gap, signature user-ID mismatch, and missing `planAuditNo` type — plus verify the full Approve flow, email sends, file handling, and dashboard display are correct.

**Architecture:** Service-layer fixes only (no new files); all email sends follow the existing `.catch()` fire-and-forget pattern already used in `approvePlan()`; dashboard fix is a rename-only in the service return object matched to the hook type.

**Tech Stack:** Next.js 15, TypeScript, Prisma, Redis (reminders), SharePoint (file storage), Auth Center mail proxy (M365 delegated token)

## Global Constraints

- Never add a new dependency — all fixes use existing utilities.
- All email sends remain fire-and-forget with `.catch(err => logger.error(...))` — never block the HTTP response on mail.
- Idempotency keys stay unchanged — only fix call-site patterns.
- Keep bilingual (Thai/English) content in all notification titles/bodies.
- `actor.authUserId ?? actor.userId` is the canonical user identifier — never use `.userId` alone for auth lookups.
- Run `npx tsc --noEmit` after each task to verify no TypeScript regressions.

---

## Bug Inventory (confirmed by code audit)

| ID | Severity | File | Lines | Description |
|----|----------|------|-------|-------------|
| B1 | CRITICAL | `services/audit/auditPlanService.ts` | 604–612 | Dashboard return object keys don't match hook type — 4 metrics always `undefined` |
| B2 | HIGH | `services/audit/auditPlanWorkflowService.ts` | 97, 159 | `_issueTokenAndNotify()` called without `.catch()` — silent failure, no logging |
| B3 | HIGH | `app/api/audit/attachments/upload/route.ts` | 70–89 | SharePoint upload result not validated before DB write — crash on partial failure |
| B4 | MEDIUM | `hooks/api/use-audit-dashboard.ts` | 15–24 | `AuditDashboardSchedule` type missing `planAuditNo` field returned by service |
| B5 | MEDIUM | `services/audit/auditAppointmentService.ts` | 426, 492 | Signature saved with `actor.userId` instead of canonical `actor.authUserId ?? actor.userId` |
| B6 | LOW | `services/audit/auditPlanService.ts` | 536 | Malformed comment (`\ Email:`) — syntax/lint error |

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `services/audit/auditPlanService.ts` | Modify | Fix B1 (property names) + B6 (malformed comment) |
| `services/audit/auditPlanWorkflowService.ts` | Modify | Fix B2 (add `.catch()` to two `_issueTokenAndNotify` calls) |
| `app/api/audit/attachments/upload/route.ts` | Modify | Fix B3 (validate SharePoint result before DB write) |
| `hooks/api/use-audit-dashboard.ts` | Modify | Fix B4 (add `planAuditNo` to type) |
| `services/audit/auditAppointmentService.ts` | Modify | Fix B5 (use canonical `actorId` for signature upsert) |

No new files. No schema changes.

---

### Task 1: Fix Dashboard Data Property Name Mismatch (B1 + B6)

**Files:**
- Modify: `services/audit/auditPlanService.ts:604–612` (return object)
- Modify: `services/audit/auditPlanService.ts:536` (malformed comment)

**Interfaces:**
- Produces: `getDashboardData()` returns `{ counts: AuditDashboardCounts, upcomingSchedules, recentFindings }` with correct keys

- [ ] **Step 1: Read the current return object and hook type**

Read `services/audit/auditPlanService.ts` lines 595–620 and `hooks/api/use-audit-dashboard.ts` lines 1–30. Confirm the exact current key names.

- [ ] **Step 2: Fix the return object keys in auditPlanService.ts**

Find the `getDashboardData()` return statement (around line 604). Replace the `counts` object so every key matches `AuditDashboardCounts`:

```typescript
// BEFORE (wrong keys):
return {
  counts: {
    total,
    inProgress,
    waitingCorrective,
    openFindings,
    overdueFindings,
    pendingSignoffs,
  },
  ...
};

// AFTER (correct keys):
return {
  counts: {
    totalPlans: total,
    inProgressPlans: inProgress,
    waitingCorrectivePlans: waitingCorrective,
    openFindings,
    overdueCorrectiveActions: overdueFindings,
    pendingSignoffs,
  },
  ...
};
```

- [ ] **Step 3: Fix the malformed comment on line 536**

Find line 536 which contains `\ Email: notify plan owner`. Replace with:

```typescript
// Email: notify plan owner
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors related to `getDashboardData` or `AuditDashboardCounts`.

- [ ] **Step 5: Commit**

```bash
git add services/audit/auditPlanService.ts
git commit -m "fix: correct dashboard counts property names and malformed comment in auditPlanService"
```

---

### Task 2: Fix Unhandled Promise Rejections in Workflow Notification (B2)

**Files:**
- Modify: `services/audit/auditPlanWorkflowService.ts:97` (submitPlan)
- Modify: `services/audit/auditPlanWorkflowService.ts:159` (reviewPlan)

**Interfaces:**
- Consumes: `_issueTokenAndNotify(planId, auditNo, title, opts)` — returns `Promise<void>`
- Produces: Same calls, now with `.catch()` error logging (fire-and-forget, non-blocking)

- [ ] **Step 1: Read the two call sites**

Read `services/audit/auditPlanWorkflowService.ts` lines 90–115 (submitPlan) and 150–170 (reviewPlan). Note the exact call signature used.

- [ ] **Step 2: Add .catch() to the submitPlan call (line ~97)**

Find the bare `_issueTokenAndNotify(...)` call inside `submitPlan()`. Append `.catch()`:

```typescript
// BEFORE:
_issueTokenAndNotify(planId, updated.auditNo, updated.title, {
  targetAuthUserId: input.reviewerAuthUserId,
  targetEmail: input.reviewerEmail,
  targetName: input.reviewerNameSnapshot ?? input.reviewerEmail,
  signedRole: "REVIEWER",
  senderAccessToken: actor.accessToken,
});

// AFTER:
_issueTokenAndNotify(planId, updated.auditNo, updated.title, {
  targetAuthUserId: input.reviewerAuthUserId,
  targetEmail: input.reviewerEmail,
  targetName: input.reviewerNameSnapshot ?? input.reviewerEmail,
  signedRole: "REVIEWER",
  senderAccessToken: actor.accessToken,
}).catch((err) =>
  logger.error("[auditWorkflow] failed to issue token/notify reviewer", {
    planId,
    signedRole: "REVIEWER",
    error: String(err),
  })
);
```

- [ ] **Step 3: Add .catch() to the reviewPlan call (line ~159)**

Find the bare `_issueTokenAndNotify(...)` call inside the `if (plan.approverAuthUserId && plan.approverEmail)` block in `reviewPlan()`:

```typescript
// BEFORE:
_issueTokenAndNotify(planId, updated.auditNo, updated.title, {
  targetAuthUserId: plan.approverAuthUserId,
  targetEmail: plan.approverEmail,
  targetName: plan.approverNameSnapshot ?? plan.approverEmail,
  signedRole: "APPROVER",
  senderAccessToken: actor.accessToken,
});

// AFTER:
_issueTokenAndNotify(planId, updated.auditNo, updated.title, {
  targetAuthUserId: plan.approverAuthUserId,
  targetEmail: plan.approverEmail,
  targetName: plan.approverNameSnapshot ?? plan.approverEmail,
  signedRole: "APPROVER",
  senderAccessToken: actor.accessToken,
}).catch((err) =>
  logger.error("[auditWorkflow] failed to issue token/notify approver", {
    planId,
    signedRole: "APPROVER",
    error: String(err),
  })
);
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add services/audit/auditPlanWorkflowService.ts
git commit -m "fix: add .catch() error logging to _issueTokenAndNotify calls in submitPlan and reviewPlan"
```

---

### Task 3: Validate SharePoint Upload Result Before DB Write (B3)

**Files:**
- Modify: `app/api/audit/attachments/upload/route.ts:70–89`

**Interfaces:**
- Consumes: `uploadFileToAudit()` returns `{ spWebUrl: string, spItemId: string, spDownloadUrl?: string }`
- Produces: Returns 502 with descriptive error if SharePoint result is missing required fields; only calls `repo.create()` on valid result

- [ ] **Step 1: Read the current upload handler**

Read `app/api/audit/attachments/upload/route.ts` lines 60–94 in full to understand the exact variable names and try/catch structure.

- [ ] **Step 2: Add result validation after uploadFileToAudit()**

After the `const result = await uploadFileToAudit(...)` call, add a guard:

```typescript
const result = await uploadFileToAudit({
  fileBuffer: buffer,
  fileName: file.name,
  mimeType: storedMimeType,
  planId,
});

// Guard: SharePoint must return all required fields
if (!result?.spWebUrl || !result?.spItemId) {
  return sendError("File upload to storage failed — incomplete response", 502);
}

const attachment = await repo.create({
  resourceType,
  resourceId,
  fileName: file.name,
  fileUrl: result.spWebUrl,
  sharePointItemId: result.spItemId,
  mimeType: storedMimeType,
  sizeBytes: file.size,
  uploadedByAuthUserId: session.user.authUserId ?? session.user.id,
  spDownloadUrl: result.spDownloadUrl ?? null,
});
```

Note: `sendError` is the existing utility from `@/lib/apiResponse` — check that import exists; if the utility is named differently (e.g., `sendBadRequest`), use the correct name from the existing imports at the top of the file.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/audit/attachments/upload/route.ts
git commit -m "fix: validate SharePoint upload result before writing attachment record to DB"
```

---

### Task 4: Add planAuditNo to AuditDashboardSchedule Type (B4)

**Files:**
- Modify: `hooks/api/use-audit-dashboard.ts:15–24`

**Interfaces:**
- Produces: `AuditDashboardSchedule` now includes `planAuditNo: string` matching what the service returns

- [ ] **Step 1: Read the type definition**

Read `hooks/api/use-audit-dashboard.ts` lines 1–40. Note the exact shape of `AuditDashboardSchedule`.

- [ ] **Step 2: Add the missing field**

Find the `AuditDashboardSchedule` type definition and add `planAuditNo`:

```typescript
// BEFORE:
export type AuditDashboardSchedule = {
  id: string;
  planId: string;
  planTitle: string;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  departmentName: string | null;
  confirmStatus: string;
};

// AFTER:
export type AuditDashboardSchedule = {
  id: string;
  planId: string;
  planTitle: string;
  planAuditNo: string;       // returned by getDashboardData, used for display/linking
  sessionTitle: string;
  startAt: string;
  endAt: string;
  departmentName: string | null;
  confirmStatus: string;
};
```

The exact existing fields may differ slightly — only add `planAuditNo: string`, do not remove or rename existing fields.

- [ ] **Step 3: Check if AuditDashboardClient uses planAuditNo**

Read `components/audit/AuditDashboardClient.tsx`. If it already references `planAuditNo`, no UI change needed. If it doesn't reference it but should (e.g., to show the audit number next to session title), add it where the schedule list is rendered:

```tsx
// Example: wherever schedules are mapped, add audit number display
<span className="text-xs text-muted-foreground">{schedule.planAuditNo}</span>
```

Only add this if the field is clearly missing from an existing display row. Skip if it would require significant UI restructuring.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors on `AuditDashboardSchedule`.

- [ ] **Step 5: Commit**

```bash
git add hooks/api/use-audit-dashboard.ts
git commit -m "fix: add planAuditNo to AuditDashboardSchedule type to match service return shape"
```

---

### Task 5: Fix Signature Saved to Wrong User (B5)

**Files:**
- Modify: `services/audit/auditAppointmentService.ts:426` (review method)
- Modify: `services/audit/auditAppointmentService.ts:492` (approve method)

**Interfaces:**
- Consumes: `userPrefRepo.upsertSignature(userId, data, tx)` — first arg should be the canonical local user ID
- Produces: Signature preference saved to the correct local user record

**Context:** The service defines `actorId = actor.authUserId ?? actor.userId` at the top of each method for auth lookups. However, `userPrefRepo.upsertSignature()` takes a **local DB user ID** (not authUserId). The bug is the condition guard `actor.userId` which may be undefined if only `authUserId` is present — the save is silently skipped.

- [ ] **Step 1: Read the review() and approve() methods**

Read `services/audit/auditAppointmentService.ts` lines 390–510. Note:
1. How `actorId` is defined at the method start
2. The exact condition at lines 426 and 492
3. What `userPrefRepo.upsertSignature` first argument represents (local userId vs authUserId)

- [ ] **Step 2: Fix the guard condition in review() (~line 426)**

The guard currently checks `actor.userId`. If the repo expects local userId, keep `actor.userId` as the argument but fix the guard to not silently skip when only `authUserId` is present. The correct pattern depends on what the repo expects:

**If `upsertSignature` takes local userId:**
```typescript
// BEFORE:
if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.userId) {
  await userPrefRepo.upsertSignature(actor.userId, { ... }, tx);
}

// AFTER: guard on userId (correct — local DB id needed for upsert)
// But log a warning if missing so it's debuggable
if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
  if (actor.userId) {
    await userPrefRepo.upsertSignature(actor.userId, {
      savedSignatureUrl: sigBody.signatureDataUrl,
      signatureType: (sigBody.signatureType as "DRAW" | "TYPE" | "IMAGE") ?? "DRAW",
    }, tx);
  } else {
    logger.warn("[appointment] cannot save signature pref — no local userId", {
      actorAuthUserId: actor.authUserId,
    });
  }
}
```

- [ ] **Step 3: Apply same fix in approve() (~line 492)**

Identical change in the `approve()` method at line 492.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add services/audit/auditAppointmentService.ts
git commit -m "fix: add warning log when signature pref cannot be saved due to missing local userId"
```

---

### Task 6: End-to-End Flow Verification (Approve Flow, Email, Files, Dashboard)

This task is a manual audit checklist — no code changes unless a gap is found. Run through each checkpoint and note any additional bugs.

**Files:**
- Read: `services/audit/auditPlanWorkflowService.ts` (full approve flow)
- Read: `services/audit/auditEmailService.ts` (all email functions)
- Read: `components/audit/AuditDashboardClient.tsx` (dashboard display)
- Read: `app/(dashboard)/audit/page.tsx` (dashboard page)

- [ ] **Step 1: Verify Approve Flow completeness**

Read `auditPlanWorkflowService.ts` fully. Confirm each state transition fires the correct email + in-app notification:

| Transition | Email | In-app |
|------------|-------|--------|
| DRAFT → PENDING_REVIEW (submit) | Sign request to reviewer | Owner: submitted |
| PENDING_REVIEW → PENDING_APPROVAL (review) | Sign request to approver | Owner: reviewed |
| PENDING_APPROVAL → PLANNED (approve) | Announcement blast + dept emails | Auditors + owner |
| Any → DRAFT (reject) | Rejection email to owner | Owner: rejected |

If any cell is missing, add the notification call following the `.catch()` fire-and-forget pattern.

- [ ] **Step 2: Verify email token flow for sign requests**

Confirm `_issueTokenAndNotify()` creates an ActionToken before sending the sign-request email, and that the email link uses the token correctly:
- Token URL format: `/approve/audit/{planId}/reviewer?token={token}` and `/approve/audit/{planId}/approver?token={token}`
- Approve page routes exist: `app/(dashboard)/approve/audit/[id]/reviewer/page.tsx` and `approver/page.tsx`

If the URL format in the email doesn't match the actual page routes, fix the URL in `auditEmailService.ts → sendAuditSignRequestEmail()`.

- [ ] **Step 3: Verify Dashboard displays all 6 metrics**

After Task 1's fix, read `components/audit/AuditDashboardClient.tsx` and confirm it reads exactly these keys from the hook:
- `counts.totalPlans`
- `counts.inProgressPlans`
- `counts.waitingCorrectivePlans`
- `counts.openFindings`
- `counts.overdueCorrectiveActions`
- `counts.pendingSignoffs`

If any metric card still references old names (e.g., `counts.total`), fix the component to use the new names.

- [ ] **Step 4: Verify file upload shows correctly in UI**

Read `components/audit/` for any attachment list component. Confirm:
- Attachment list fetches from `GET /api/audit/attachments?resourceType=...&resourceId=...`
- Download links use `spDownloadUrl` (pre-authenticated, no extra headers needed)
- Delete uses `DELETE /api/audit/attachments/[id]`
- File size is displayed using `formatBytes()` from `lib/formatters.ts`

If the attachment display component is missing `formatBytes`, add the import and apply it.

- [ ] **Step 5: Commit any fixes found during verification**

```bash
git add <changed files>
git commit -m "fix: correct audit approve flow notification gaps and dashboard display issues found in verification"
```

---

### Task 7: Final TypeScript Check and Regression Test

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: 0 errors. If errors exist, fix them before proceeding.

- [ ] **Step 2: Run existing test suite**

```bash
npx jest --testPathPattern="audit|car" --passWithNoTests 2>&1 | tail -30
```

Expected: All tests pass. Fix any regressions before proceeding.

- [ ] **Step 3: Verify no lint errors**

```bash
npx eslint services/audit/ app/api/audit/ hooks/api/use-audit-dashboard.ts --max-warnings 0 2>&1 | tail -20
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: final lint and type cleanup for audit module bugfix batch"
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dashboard shows wrong counts until B1 deployed | CERTAIN (bug exists now) | HIGH | Task 1 is first |
| Sign request emails silently drop on token failure | HIGH (no .catch in prod) | HIGH | Task 2 |
| Crash on SharePoint partial failure | MEDIUM (SP reliability) | HIGH | Task 3 |
| TypeScript type drift causes silent `undefined` in component | HIGH | MEDIUM | Task 4 |
| Signature pref lost for authUserId-only users | LOW | LOW | Task 5 |

## Execution Order

Tasks 1–5 are independent and can be parallelized by a subagent-driven workflow. Task 6 depends on Tasks 1–5 being complete. Task 7 must be last.

**Recommended parallel groups:**
- Group A (parallel): Tasks 1, 2, 3, 4, 5
- Group B (sequential): Task 6 (after Group A)
- Group C (sequential): Task 7 (after Group B)
