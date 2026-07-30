import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRole } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

const paramSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    const { id } = paramSchema.parse(await params);
    const detail = await service.getKpiById(id);
    const preview = {
      kpiId: detail.id,
      department: detail.department,
      yearly: detail.yearly,
      status: detail.status,
      revisionHistory: detail.revisionHistory.map((entry, idx) => ({
        index: idx + 1,
        revisedAt: entry.revisedAt,
        revisedByRole: entry.revisedByRole,
        reason: entry.reason,
        revisedObjectiveIds: entry.revisedObjectiveIds,
        objectives: entry.objectiveSnapshots.map((snap) => ({
          objective: snap.objective,
          target: snap.target,
          unit: snap.unit,
          frequency: snap.frequency,
          responsible: snap.responsibleNameSnapshot || snap.responsibleEmailSnapshot || '-',
          referenceDocuments: snap.referenceDocuments,
          calculationFormula: snap.calculationFormula,
          actionPlanGuidelines: snap.actionPlanGuidelines,
          revised: entry.revisedObjectiveIds.includes(snap.objectiveId),
        })),
      })),
    };
    return sendSuccess(preview, 'Revision history preview');
  } catch (error) {
    return handleApiError(error);
  }
}
