import { getDepartments, getDepartmentByCode, getDepartmentByName } from "@/lib/departmentCache";
import type { AuthCenterDepartment } from "@/lib/auth-center-admin-client";

type DeptShape = {
  id: string;
  authDepartmentId: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
};

function toDeptShape(d: AuthCenterDepartment): DeptShape {
  return {
    id: d.code,
    authDepartmentId: d.code,
    name: d.displayName,
    emailGroup: d.emailGroup ?? null,
    isActive: true,
  };
}

export class DepartmentRepository {
  async findByAuthDepartmentId(code: string) {
    const d = await getDepartmentByCode(code);
    return d ? toDeptShape(d) : null;
  }

  async findByName(name: string) {
    const d = await getDepartmentByName(name);
    return d ? toDeptShape(d) : null;
  }

  // id is now authDepartmentId / code
  async findById(id: string) {
    return (await this.findByAuthDepartmentId(id)) ?? this.findByName(id);
  }

  async findNameById(id: string) {
    const d = await this.findById(id);
    return d ?? null;
  }

  async findAll() {
    const depts = await getDepartments();
    return depts.map(toDeptShape);
  }

  async findManyWithCount() {
    const depts = await getDepartments();
    return depts.map(d => ({ ...toDeptShape(d), _count: { users: 0 } }));
  }

  async findByIdWithMembers(id: string) {
    const dept = await this.findById(id);
    if (!dept) return null;
    return { ...dept, users: [] as Array<{ id: string; name: string | null; email: string; employeeId: string | null; role: string; msUserId: string | null; createdAt: Date }> };
  }

  // These write operations go through Auth Center
  async upsertByAuthDepartmentId(code: string, name: string) {
    // Auth Center is source of truth — return a mock shape for compat
    return { dept: { id: code, authDepartmentId: code, name, emailGroup: null, isActive: true } };
  }

  async upsertDepartment(name: string) {
    return { id: name, authDepartmentId: name, name, emailGroup: null, isActive: true };
  }

  async upsertDepartmentWithEmail(name: string, emailGroup: string | null) {
    return { id: name, authDepartmentId: name, name, emailGroup, isActive: true };
  }

  async update(_id: string, _data: Record<string, unknown>) {
    // Updates go to Auth Center via departmentService
    return null;
  }
}
