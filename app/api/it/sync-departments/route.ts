import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { fetchAllEntraGroups } from "@/services/ms-graph";
import { DepartmentService } from "@/services/departmentService";

export interface SyncDeptResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

const deptService = new DepartmentService();

export async function POST() {
  try {
    await requireRole("IT");

    const groups = await fetchAllEntraGroups();
    const result = await deptService.syncFromEntraGroups(groups);

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
