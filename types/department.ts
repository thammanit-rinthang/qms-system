import type { UserRole } from "@/generated/prisma/client";

export type DepartmentRow = {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  _count: { users: number };
  createdAt: string;
  updatedAt: string;
};

export type DepartmentDetail = DepartmentRow & {
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    employeeId: string | null;
    msUserId: string | null;
    createdAt: string;
  }>;
};
