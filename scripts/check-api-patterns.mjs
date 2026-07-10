/**
 * scripts/check-api-patterns.mjs
 *
 * Static guardrail checks for app/api route handlers.
 * Run:  node scripts/check-api-patterns.mjs
 *
 * Exits with code 1 (and prints a report) if violations are found.
 * Add to CI:  "check:api": "node scripts/check-api-patterns.mjs"
 *
 * Allowlists live at the bottom of this file.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const API_DIR = join(ROOT, "app", "api");

/**
 * Routes that legitimately have no schema validation:
 *   - nextauth: framework-managed
 *   - health: internal probe with no user input
 *   - simple ID-only action routes (param comes from path, not body/query)
 */
const NO_SCHEMA_ALLOWLIST = new Set([
  "app/api/auth/[...nextauth]/route.ts",
  "app/api/health/route.ts",
  "app/api/health/live/route.ts",
  "app/api/health/ready/route.ts",
  // Approve/reject/submit/review routes that receive no body (ID is path param)
  "app/api/dar/[id]/submit/route.ts",
  "app/api/kpi/[id]/approve/route.ts",
  "app/api/kpi/[id]/monthly/[reportId]/approve/route.ts",
  "app/api/kpi/[id]/monthly/[reportId]/review/route.ts",
  "app/api/kpi/[id]/monthly/[reportId]/submit/route.ts",
  "app/api/kpi/[id]/monthly/[reportId]/route.ts",
  "app/api/kpi/[id]/monthly/[reportId]/details/[detailId]/corrective-actions/[actionId]/route.ts",
  // Simple lookup routes with no query params
  "app/api/announcements/ticker/route.ts",
  "app/api/approvals/pending-summary/route.ts",
  "app/api/dar/reviewer-candidates/route.ts",
  "app/api/departments/route.ts",
  "app/api/document-controls/[id]/download-latest/route.ts",
  "app/api/it/departments/[id]/members/route.ts",
  "app/api/it/ms365-groups/route.ts",
  "app/api/it/sync-departments/route.ts",
  "app/api/it/sync-users/route.ts",
  "app/api/it/users/route.ts",
  "app/api/it/users/[id]/push-to-m365/route.ts",
  // ID-only action routes (no request body)
  "app/api/car/[id]/issue/route.ts",
  "app/api/car/[id]/re-car/route.ts",
  "app/api/kpi/[id]/recall/route.ts",
  "app/api/kpi/[id]/reject/route.ts",
  "app/api/kpi/[id]/review/route.ts",
  // No user-controlled query params
  "app/api/car/next-number/route.ts",
  "app/api/car/pending-count/route.ts",
  "app/api/qms/mr/route.ts",
  "app/api/users/assignees/route.ts",
  // FormData with inline file validation (no Zod needed)
  "app/api/sharepoint/upload-file/route.ts",
  // Auth Center OAuth callback — token validated inline via handleAuthCenterCallback
  "app/api/auth/center/callback/route.ts",
  // Health probe — no user input
  "app/api/auth/center/health/route.ts",
  // Notification routes — no body/query params, auth-only
  "app/api/notifications/route.ts",
  "app/api/notifications/read-all/route.ts",
  "app/api/notifications/[id]/read/route.ts",
  // Deprecated endpoint — returns 410 with no body
  "app/api/qms/mr/[id]/route.ts",
  // DELETE/GET with path-param only
  "app/api/notifications/[id]/route.ts",
  // GET-only routes with no query params
  "app/api/announcements/public/route.ts",
  "app/api/audit/appointments/users/route.ts",
  "app/api/audit/dashboard/route.ts",
  "app/api/audit/my-tasks/route.ts",
  // Action routes — path param only, no body
  "app/api/audit/appointments/[id]/resend-notification/route.ts",
  "app/api/audit/findings/[id]/close/route.ts",
  "app/api/audit/plans/[id]/close/route.ts",
  "app/api/audit/plans/[id]/complete/route.ts",
  "app/api/audit/plans/[id]/delete/route.ts",
  "app/api/car/[id]/remind/route.ts",
  // DELETE with path param only
  "app/api/audit/attachments/[id]/route.ts",
  // FormData file upload with inline validation
  "app/api/audit/attachments/upload/route.ts",
  "app/api/audit/schedules/[id]/submit-checklist/route.ts",
  "app/api/car/response/[responseId]/attachments/route.ts",
  // Cron endpoint — no user-controlled input
  "app/api/cron/car-reminder/route.ts",
  // Cron endpoint — no user-controlled input (force=1 is internal-only)
  "app/api/cron/kpi-monthly-reminder/route.ts",
  // POST with no body — auth-protected sync triggers
  "app/api/doc-control/departments/sync/route.ts",
  "app/api/kpi-dept/sync/route.ts",
  // GET with enum-validated query param (inline check, no body)
  "app/api/dar/role-users/route.ts",
]);

const NO_ERROR_HANDLER_ALLOWLIST = new Set([
  "app/api/audit-logs/export/route.ts", // returns raw Response (Excel stream), not standard envelope
  "app/api/auth/[...nextauth]/route.ts",
  "app/api/health/route.ts",
  "app/api/health/live/route.ts",
  "app/api/health/ready/route.ts",
  "app/api/it/ms365-groups/route.ts",
  "app/api/sharepoint/create-folder/route.ts",
  "app/api/sharepoint/delete-item/route.ts",
  "app/api/sharepoint/get-file/route.ts",
  "app/api/sharepoint/upload-file/route.ts",
  "app/api/dar/attachments/temp/route.ts",
  // Auth Center OAuth callback — redirects on error, no JSON envelope
  "app/api/auth/center/callback/route.ts",
  // Health probe — no standard envelope needed
  "app/api/auth/center/health/route.ts",
  // Cron endpoint — uses raw NextResponse with custom error format
  "app/api/cron/car-reminder/route.ts",
  "app/api/cron/kpi-monthly-reminder/route.ts",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, results);
    } else if (entry === "route.ts") {
      results.push(full);
    }
  }
  return results;
}

function rel(full) {
  return relative(ROOT, full).replace(/\\/g, "/");
}

// ── Checks ────────────────────────────────────────────────────────────────────

function checkHandleApiError(content, relPath) {
  if (NO_ERROR_HANDLER_ALLOWLIST.has(relPath)) return null;
  if (!content.includes("handleApiError")) {
    return "missing handleApiError — catch blocks must return handleApiError(err)";
  }
  return null;
}

function checkSchemaValidation(content, relPath) {
  if (NO_SCHEMA_ALLOWLIST.has(relPath)) return null;
  const hasValidation =
    content.includes(".parse(") ||
    content.includes(".safeParse(") ||
    content.includes(".parseAsync(") ||
    content.includes(".safeParseAsync(");
  if (!hasValidation) {
    return "missing schema validation — add a Zod .parse() or .safeParse() call";
  }
  return null;
}

const DIRECT_DB_ALLOWLIST = new Set([
  "app/api/health/route.ts",
  "app/api/health/ready/route.ts",
  // Routes that use db.$transaction() as a coordinator — pending LocalRoleGrantRepository extraction
  "app/api/audit/session-plans/[planId]/route.ts",
  "app/api/dar/role-users/route.ts",
  "app/api/it/users/[id]/role/route.ts",
  "app/api/qms/mr/[id]/route.ts",
  // Excel export routes — complex multi-table queries with no service abstraction benefit
  "app/api/audit/appointments/export/route.ts",
  "app/api/car/export/route.ts",
  "app/api/dar/export/route.ts",
  "app/api/kpi/export/route.ts",
  "app/api/kpi/monthly-export/route.ts",
]);

function checkDirectDbImport(content, relPath) {
  if (DIRECT_DB_ALLOWLIST.has(relPath)) return null;
  if (content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'")) {
    return "direct @/lib/db import — use a service + repository instead";
  }
  return null;
}

// ── Runner ────────────────────────────────────────────────────────────────────

const routes = walk(API_DIR);
const violations = [];

for (const fullPath of routes) {
  const relPath = rel(fullPath);
  const content = readFileSync(fullPath, "utf8");

  const checks = [
    checkHandleApiError(content, relPath),
    checkSchemaValidation(content, relPath),
    checkDirectDbImport(content, relPath),
  ].filter(Boolean);

  for (const msg of checks) {
    violations.push({ file: relPath, msg });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log(`✓  All ${routes.length} API routes pass architecture checks.`);
  process.exit(0);
}

console.error(`\n✗  Found ${violations.length} architecture violation(s) in ${routes.length} routes:\n`);

const byFile = Map.groupBy(violations, (v) => v.file);
for (const [file, issues] of byFile) {
  console.error(`  ${file}`);
  for (const { msg } of issues) {
    console.error(`    → ${msg}`);
  }
  console.error();
}

console.error(
  "To suppress a known exception, add the route path to the appropriate\n" +
  "allowlist in scripts/check-api-patterns.mjs.\n"
);

process.exit(1);
