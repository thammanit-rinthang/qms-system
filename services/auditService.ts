import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'RECALL'
  | 'SUBMIT'
  | 'REVIEW'
  | 'SYNC'
  | 'EXPORT'
  | 'ROLE_CHANGE'
  | 'ISSUE'
  | 'RESPOND'
  | 'VERIFY_1'
  | 'VERIFY_2'
  | 'CLOSE'
  | 'RE_CAR'
  | 'ASSIGN_AUDITOR'
  | 'ANNOUNCE'
  | 'GENERATE_REPORT'
  | 'SIGN'
  | 'REOPEN'
  | 'DOWNLOAD';

export type AuditResourceType =
  | 'KPI'
  | 'KPI_OBJECTIVE'
  | 'KPI_MONTHLY_REPORT'
  | 'DAR'
  | 'USER'
  | 'DOCUMENT'
  | 'DOCUMENT_CATEGORY'
  | 'CAR'
  // Audit module resource types
  | 'AUDIT_PLAN'
  | 'AUDIT_SCHEDULE'
  | 'AUDIT_FINDING'
  | 'AUDIT_REPORT'
  | 'AUDIT_ANNOUNCEMENT'
  | 'AUDIT_APPOINTMENT';

export interface AuditEntry {
  actorUserId: string;
  actorAuthUserId?: string | null;
  actorRole: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Record an audit entry. Pass `tx` to write inside an existing transaction
   * so the audit is atomic with the business action.
   */
  static async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? db;
    await client.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorAuthUserId: entry.actorAuthUserId ?? null,
        actorRole: entry.actorRole,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        before: entry.before !== undefined ? (entry.before as Prisma.InputJsonValue) : undefined,
        after: entry.after !== undefined ? (entry.after as Prisma.InputJsonValue) : undefined,
        metadata: entry.metadata !== undefined ? (entry.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
