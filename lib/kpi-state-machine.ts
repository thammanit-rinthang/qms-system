import { MonthlyStatus } from '@/generated/prisma/client';
import { ConflictError } from '@/errors/customErrors';

const ALLOWED_TRANSITIONS: Record<MonthlyStatus, MonthlyStatus[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT', 'PENDING_REVIEW'],
};

export function ensureMonthlyStatusTransition(from: MonthlyStatus, to: MonthlyStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConflictError(`Invalid monthly report transition: ${from} → ${to}`);
  }
}
