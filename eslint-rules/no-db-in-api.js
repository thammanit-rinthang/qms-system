/**
 * ESLint rule: no-db-in-api
 *
 * Blocks direct import of @/lib/db inside:
 *   - app/api/**  (route handlers must never touch the DB client)
 *   - services/** (services must use repositories; $transaction is the only exception)
 *
 * Allowed exceptions (add to the allowlist array below):
 *   - app/api/health/route.ts  — infra probe, intentionally uses $queryRaw
 */

"use strict";

const BLOCKED_SOURCE = "@/lib/db";

const API_ALLOWLIST = new Set([
  "app/api/health/route.ts",
  "app/api/health/ready/route.ts", // infra readiness probe, intentionally uses $queryRaw
  // Routes that use db.$transaction() as a coordinator — legitimate until LocalRoleGrantRepository is extracted
  "app/api/audit/session-plans/[planId]/route.ts",
  "app/api/dar/role-users/route.ts",
  "app/api/it/users/[id]/role/route.ts",
  "app/api/qms/mr/[id]/route.ts",
]);

const SERVICES_ALLOWLIST = new Set([
  "services/healthService.ts",    // infrastructure readiness probe — intentionally uses $queryRaw
  "services/auditService.ts",     // cross-cutting audit writer — must accept tx param to stay atomic
  // New services pending repository extraction
  "services/kpiDeptService.ts",
  "services/kpiMonthlyReminderService.ts",
  "services/kpiService.ts",          // db.kpiDept.findFirst in createKpi — pending KpiDeptRepository
  "services/docControlDeptService.ts",
  "services/documentCategoryService.ts",
  "services/documentControlService.ts",
]);

/** Normalise Windows back-slashes so regex paths work cross-platform */
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

/** Return true when the absolute file path is inside the given segment */
function inSegment(filePath, segment) {
  return normalizePath(filePath).includes(`/${segment}/`);
}

/** Strip the project root prefix so the allowlist paths are short */
function projectRelative(filePath) {
  const p = normalizePath(filePath);
  const marker = "/qms-system/";
  const idx = p.lastIndexOf(marker);
  return idx >= 0 ? p.slice(idx + marker.length) : p;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent direct import of @/lib/db in app/api/** and services/**",
      category: "Architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noDbInApi:
        "Route handlers must not import @/lib/db directly. " +
        "Move DB logic to a service + repository instead.",
      noDbInService:
        "Services must not import @/lib/db for direct queries. " +
        "Use a repository method. Only db.$transaction() is permitted — " +
        "move it to the service layer and pass `tx` down to repositories.",
    },
  },

  create(context) {
    const filePath = context.getFilename();
    const rel = projectRelative(filePath);

    return {
      ImportDeclaration(node) {
        if (node.source.value !== BLOCKED_SOURCE) return;

        if (inSegment(filePath, "app/api")) {
          if (API_ALLOWLIST.has(rel)) return;
          context.report({ node, messageId: "noDbInApi" });
          return;
        }

        if (inSegment(filePath, "services")) {
          if (SERVICES_ALLOWLIST.has(rel)) return;

          // Warn (not error) if every usage is $transaction — the team
          // currently uses services as transaction coordinators.
          // Future: migrate $transaction calls to a dedicated txRunner helper
          // and remove this allowance.
          const hasOnlyTransaction = context
            .getSourceCode()
            .getText()
            .match(/db\.\$transaction/g);

          const hasRawQuery = context
            .getSourceCode()
            .getText()
            .match(/db\.[a-zA-Z]+(?!\$transaction)/g);

          if (hasOnlyTransaction && !hasRawQuery) return; // legitimate coordinator
          context.report({ node, messageId: "noDbInService" });
        }
      },
    };
  },
};
