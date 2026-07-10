import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError, NotFoundError, ForbiddenError } from "@/errors/customErrors";
import { CarAttachmentRepository } from "@/repositories/carAttachmentRepository";
import { uploadFileToCarResponse, deleteSpItem } from "@/services/sharepoint";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { logger } from "@/lib/logger";

const repo = new CarAttachmentRepository();

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ responseId: string }> },
) {
  try {
    const session = await requireAuth();
    const { responseId } = await params;

    const response = await repo.findResponseWithCar(responseId);
    if (!response) throw new NotFoundError("CAR Response");

    const car = response.carMaster;
    if (car.status === "CLOSED" || car.status === "CANCELLED") {
      throw new ValidationError("ไม่สามารถเพิ่มไฟล์ใน CAR ที่ปิดแล้วหรือยกเลิกแล้ว");
    }

    const { user } = session;
    const isPrivileged = user.role === "QMS" || user.role === "IT" || user.role === "MR";
    const inTargetDept = (user.authDepartmentId && car.targetAuthDepartmentId)
      ? user.authDepartmentId === car.targetAuthDepartmentId
      : user.departmentId === car.targetDepartmentId;
    if (!isPrivileged && !inTargetDept) throw new ForbiddenError();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("ไม่พบไฟล์ในคำขอ");
    if (file.size > MAX_SIZE) throw new ValidationError("ไฟล์ต้องมีขนาดไม่เกิน 20 MB");
    if (!ALLOWED_MIME.has(file.type)) throw new ValidationError("ประเภทไฟล์ไม่รองรับ");

    const buffer = new Uint8Array(await file.arrayBuffer());
    const sp = await uploadFileToCarResponse({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      carNo: car.carNo,
    });

    let attachment;
    try {
      const snapshot = user.authUserId ? await getUserSnapshot(user.authUserId) : null;
      const uploaderName = snapshot?.name ?? null;

      attachment = await repo.createAttachment({
        carResponseId: responseId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        spItemId: sp.spItemId,
        spWebUrl: sp.spWebUrl,
        spDownloadUrl: sp.spDownloadUrl,
        folderPath: sp.folderPath,
        uploadedById: user.id,
        uploadedByAuthUserId: user.authUserId ?? null,
        uploadedByName: uploaderName,
      });
    } catch (dbErr) {
      logger.error("[CAR attachment] DB insert failed, compensating SP delete", dbErr);
      await deleteSpItem(sp.spItemId).catch((e) =>
        logger.error("[CAR attachment] SP compensation delete failed", e),
      );
      throw dbErr;
    }

    return NextResponse.json(
      {
        data: {
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          spWebUrl: attachment.spWebUrl,
          spDownloadUrl: attachment.spDownloadUrl,
          folderPath: attachment.folderPath,
          createdAt: attachment.createdAt.toISOString(),
          uploadedBy: { id: user.id, name: attachment.uploadedByName },
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
