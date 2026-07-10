import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ForbiddenError } from "@/errors/customErrors";
import { redirect } from "next/navigation";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { listAuthCenterDepartments } from "@/lib/auth-center-admin-client";
import DepartmentCodeClient from "@/components/qms/DepartmentCodeClient";

export const metadata: Metadata = { title: "Department Code Configuration" };

const repo = new DepartmentCodeRepository();

export default async function DepartmentCodePage() {
  let session;
  try {
    session = await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  const [authDepts, savedCodes] = await Promise.all([
    listAuthCenterDepartments({ accessToken: session.user.accessToken }),
    repo.findAll(),
  ]);

  const codeMap = new Map(savedCodes.map(c => [c.authDeptId, c]));

  const rows = authDepts.map(dept => {
    // JWT claim `authDepartmentId` = displayName in uppercase — use that as stable key
    const key = dept.displayName.toUpperCase();
    return {
      authDeptId:     key,
      departmentName: dept.displayName,
      code:           codeMap.get(key)?.code ?? "",
      savedId:        codeMap.get(key)?.id ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <DepartmentCodeClient rows={rows} />
    </div>
  );
}
