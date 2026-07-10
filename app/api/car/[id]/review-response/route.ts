import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { carReviewResponseSchema } from "@/lib/validations/car";
import { ForbiddenError } from "@/errors/customErrors";
import { CarService } from "@/services/carService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const input = carReviewResponseSchema.parse(body);

    let car;
    if (input.token) {
      car = await carService.reviewResponseByMR(id, {
        token: input.token,
        action: input.action,
        comment: input.comment,
        signaturePath: input.signaturePath,
      });
    } else {
      const session = await requireAuth();
      if (session.user.role !== "MR") {
        throw new ForbiddenError("Only MR can review this CAR response.");
      }
      car = await carService.reviewResponseByMRAuthenticated(
        id,
        session.user.id,
        { action: input.action, comment: input.comment, signaturePath: input.signaturePath, qmsAuthUserId: input.qmsAuthUserId },
        session.user.authUserId,
        session.user.accessToken,
      );
      if (input.saveToProfile && input.signaturePath && input.signatureType && session.user.authUserId) {
        const prefRepo = new UserPreferenceRepository();
        await prefRepo.upsertSignature(session.user.authUserId, {
          savedSignatureUrl: input.signaturePath,
          signatureType: input.signatureType,
        }).catch(() => {});
      }
    }

    return sendSuccess(
      car,
      input.action === "APPROVED"
        ? "CAR corrective action plan approved successfully"
        : "CAR corrective action plan rejected successfully",
    );
  } catch (err) {
    return handleApiError(err);
  }
}
