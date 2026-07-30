import { db } from "@/lib/db";
import { ForbiddenError } from "@/errors/customErrors";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

/**
 * SharePoint files are served with an app token that holds tenant-wide (Sites.ReadWrite.All)
 * access. The generic file endpoints (get-file, preview-file, office-embed) take a raw Graph
 * itemId, so without this guard any authenticated user could read ANY file in the tenant drive
 * by guessing/enumerating item ids. This refuses item ids the QMS app doesn't track.
 *
 * ponytail: existence-in-a-tracked-table check. Ceiling: this bounds reads to QMS-managed files
 * but is not per-record object-level authz — a user who reaches these endpoints can view any QMS
 * attachment across modules. Add per-module ownership checks if cross-module IDOR must be closed.
 * Perf ceiling: 9 parallel counts per uncached view (most columns unindexed); cache the boolean
 * per itemId if this shows up hot.
 */
export async function assertSpItemTracked(spItemId: string, role: string): Promise<void> {
  if (isPrivilegedQmsRole(role)) return; // QMS/MR/IT can already list/read all files

  const counts = await Promise.all([
    db.darAttachment.count({ where: { spItemId } }),
    db.carAttachment.count({ where: { spItemId } }),
    db.darMaster.count({ where: { spItemId } }),
    db.announcement.count({ where: { spItemId } }),
    db.publicDocument.count({ where: { spItemId } }),
    db.documentControl.count({ where: { spItemId } }),
    db.documentControlRevision.count({ where: { spItemId } }),
    db.kPIMonthlyReport.count({ where: { attachmentSpItemId: spItemId } }),
    db.auditAttachment.count({ where: { sharePointItemId: spItemId } }),
  ]);

  if (counts.every((c) => c === 0)) throw new ForbiddenError("File not accessible");
}
