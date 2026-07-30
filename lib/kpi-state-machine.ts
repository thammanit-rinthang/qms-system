import { KpiObjectiveStatus, MonthlyStatus } from '@/generated/prisma/client';
import { ConflictError } from '@/errors/customErrors';

const KPI_TRANSITIONS: Record<KpiObjectiveStatus, KpiObjectiveStatus[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['PENDING_APPROVAL', 'REJECTED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['QMS_CHECK', 'ANNOUNCED', 'REJECTED'],
  QMS_CHECK: ['ANNOUNCED', 'APPROVED', 'REJECTED'],
  ANNOUNCED: ['REJECTED'],
  REJECTED: ['DRAFT'],
};

const ALLOWED_TRANSITIONS: Record<MonthlyStatus, MonthlyStatus[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT', 'PENDING_REVIEW'],
};

export function ensureKpiStatusTransition(from: KpiObjectiveStatus, to: KpiObjectiveStatus): void {
  if (from === to) return;
  const allowed = KPI_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConflictError(`Invalid KPI transition: ${from} → ${to}`);
  }
}

export function ensureMonthlyStatusTransition(from: MonthlyStatus, to: MonthlyStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConflictError(`Invalid monthly report transition: ${from} → ${to}`);
  }
}
