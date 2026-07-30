import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { carCloseSchema } from "@/lib/validations/car";
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
    const input = carCloseSchema.parse(body);

    let car;
    if (input.token) {
      const session = await requireAuth().catch(() => null);
      car = await carService.closeCar(id, input.token, input.comment, input.signaturePath, input.attachments, session?.user.accessToken);
    } else {
      const session = await requireAuth();
      if (session.user.role !== "MR") {
        throw new ForbiddenError("Only MR can sign off this CAR.");
      }
      car = await carService.closeCarAuthenticated(
        id,
        session.user.id,
        input.comment,
        session.user.authUserId,
        input.signaturePath,
        input.attachments,
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

    return sendSuccess(car, "CAR closed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
