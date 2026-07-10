import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/errors/customErrors';
import { monthlyAttachmentUploadSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) throw new ValidationError('File is required');
    monthlyAttachmentUploadSchema.parse({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    const report = await service.uploadReportAttachment(reportId, file, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
    });

    return sendSuccess(report, 'Monthly report attachment uploaded successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
