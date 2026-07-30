import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRoleEdge } from '@/lib/auth';
import { ValidationError } from '@/errors/customErrors';
import { monthlyAttachmentUploadSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireRoleEdge(request, 'QMS', 'MR', 'IT');
    const formData = await request.formData();
    const { reportId } = await params;
    const file = formData.get('file') as File | null;

    if (!file) throw new ValidationError('File is required');

    const rawFilename = (formData.get("filename") as string | null) || file.name;
    let fileName = rawFilename;
    try {
      if (rawFilename.includes("%")) {
        fileName = decodeURIComponent(rawFilename);
      }
    } catch {
      // ignore
    }

    const safeFile = new File([file], fileName, { type: file.type });

    monthlyAttachmentUploadSchema.parse({
      fileName: safeFile.name,
      fileSize: safeFile.size,
      mimeType: safeFile.type,
    });

    const report = await service.uploadReportAttachment(reportId, safeFile, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
    });

    return sendSuccess(report, 'Monthly report attachment uploaded successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
