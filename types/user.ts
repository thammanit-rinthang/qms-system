import type { UserRole } from "@/generated/prisma/client";

export type UserWithDept = {
  id: string;
  authUserId?: string | null;
  name: string | null;
  email: string | null;
  employeeId: string | null;
  position?: string | null;
  role: UserRole;
  msUserId: string | null;
  department: { id: string; name: string; authDepartmentId?: string | null } | null;
  createdAt: string;
};

// Lightweight shape used by bulk-push and inline edits
export type UserPatchable = Pick<UserWithDept, "id" | "employeeId" | "msUserId">;

export type SyncResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ email: string; message: string }>;
};

