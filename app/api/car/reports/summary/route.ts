import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";

const querySchema = z.object({
  year: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
});

const carRepository = new CarRepository();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const { searchParams } = req.nextUrl;
    const query = querySchema.parse({
      year: searchParams.get("year") ?? undefined,
      department: searchParams.get("department") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const parsedYear = query.year ? parseInt(query.year, 10) : undefined;
    const parsedStatus = query.status as CarStatus | undefined;

    const data = await carRepository.findSummaryReport(parsedYear, query.department, parsedStatus);

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
