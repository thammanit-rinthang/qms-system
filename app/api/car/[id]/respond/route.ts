import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { carRespondSchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = carRespondSchema.parse(body);

    const car = await carService.respondToCar(
      id,
      session.user.id,
      session.user.departmentId,
      input,
      session.user.authUserId,
      session.user.authDepartmentId,
      session.user.accessToken,
    );
    if (input.saveToProfile && input.responderSignaturePath && input.responderSignatureType && session.user.authUserId) {
      const prefRepo = new UserPreferenceRepository();
      await prefRepo.upsertSignature(session.user.authUserId, {
        savedSignatureUrl: input.responderSignaturePath,
        signatureType: input.responderSignatureType,
      }).catch(() => {});
    }
    return sendSuccess(car, "CAR response submitted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
