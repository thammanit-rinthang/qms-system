import { NextResponse } from "next/server";
import { AppError } from "@/errors/customErrors";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

type ApiErrorContext = {
  route?: string;
  method?: string;
  requestId?: string;
  userId?: string;
};

export function handleApiError(error: unknown, context?: ApiErrorContext): NextResponse {
  // Only log unexpected server errors — validation and expected 4xx flow should not be error-level.
  if (!(error instanceof AppError) && !(error instanceof ZodError)) {
    logger.error("api_error", error, context);
  } else if (error instanceof AppError && error.statusCode >= 500) {
    logger.error("api_error", error, context);
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.errorCode,
          details: error.details,
        },
      },
      {
        status: error.statusCode,
        headers: context?.requestId ? { "X-Request-Id": context.requestId } : undefined,
      }
    );
  }

  if (error instanceof ZodError) {
    logger.warn("api_validation_error", {
      ...context,
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      {
        status: 400,
        headers: context?.requestId ? { "X-Request-Id": context.requestId } : undefined,
      }
    );
  }

  // Fallback for unhandled native/unknown errors.
  // Always return a generic message to the client to avoid leaking internal details
  // (e.g., Prisma constraint text, SharePoint API responses, infrastructure messages).
  // Detailed information is already captured by the logger.error call above.
  const message = "An unexpected error occurred";
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: "INTERNAL_SERVER_ERROR",
      },
    },
    {
      status: 500,
      headers: context?.requestId ? { "X-Request-Id": context.requestId } : undefined,
    }
  );
}
