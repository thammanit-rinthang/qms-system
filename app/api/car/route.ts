import { requireAuth, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { carCreateSchema, carListQuerySchema } from "@/lib/validations/car";
import { CarService } from "@/services/carService";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const isPrivileged =
      session.user.role === "QMS" ||
      session.user.role === "IT" ||
      session.user.role === "MR";
    const searchParams = req.nextUrl.searchParams;
    const query = carListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sourceType: searchParams.get("sourceType") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
    });

    const requestedScope = query.scope ?? (isPrivileged ? "all" : "my-department");

    const result = await carService.listCars(query, {
      scope: requestedScope,
      issuerAuthUserId: session.user.id,
      authDepartmentId: session.user.authDepartmentId ?? null,
    });

    return sendSuccess(result.data, "CARs retrieved successfully", 200, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("QMS", "MR", "IT");
    const body = await req.json();
    const input = carCreateSchema.parse(body);
    const car = await carService.createCar(session.user.id, input, session.user.authUserId);
    return sendSuccess(car, "CAR created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
