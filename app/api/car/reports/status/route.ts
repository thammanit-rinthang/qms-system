import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";

const querySchema = z.object({
  dueFilter: z.string().optional(),
  status: z.string().optional(),
});

const carRepository = new CarRepository();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const { searchParams } = req.nextUrl;
    const query = querySchema.parse({
      dueFilter: searchParams.get("dueFilter") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const parsedStatus = (query.status && query.status !== "all" ? query.status : undefined) as CarStatus | undefined;

    const data = await carRepository.findStatusReport(query.dueFilter, parsedStatus);

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
