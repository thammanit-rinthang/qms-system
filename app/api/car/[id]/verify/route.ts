import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { carVerifySchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถติดตามผล CAR ได้");
    }

    const { id } = await params;
    const body = await req.json();
    const input = carVerifySchema.parse(body);
    const car = await carService.verifyCar(id, session.user.id, input, session.user.authUserId, session.user.accessToken);
    if (input.saveToProfile && input.verifierSignaturePath && input.verifierSignatureType && session.user.authUserId) {
      const prefRepo = new UserPreferenceRepository();
      await prefRepo.upsertSignature(session.user.authUserId, {
        savedSignatureUrl: input.verifierSignaturePath,
        signatureType: input.verifierSignatureType,
      }).catch(() => {});
    }
    return sendSuccess(car, "CAR verification recorded successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
