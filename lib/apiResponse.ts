import { NextResponse } from "next/server";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  error?: unknown;
}

export function sendSuccess<T>(
  data?: T,
  message: string = "Success",
  status: number = 200,
  meta?: PaginationMeta
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    message,
  };

  if (data !== undefined) response.data = data;
  if (meta !== undefined) response.meta = meta;

  return NextResponse.json(response, { status });
}
