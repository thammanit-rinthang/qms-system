import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import DepartmentTable from "@/components/it/DepartmentTable";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import en from "@/messages/en.json";
import { UnauthorizedError } from "@/lib/errors";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: en.it.departments.title,
};

const deptService = new DepartmentService();

export default async function ItDepartmentsPage() {
  const session = await requireRole("IT");
  
  let departments;
  try {
    departments = await deptService.getAllDepartments(session.user.accessToken);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signout?callbackUrl=/it/departments");
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {departments.length === 0 ? (
        <>
          <PageHeader titleKey="it.departments.title" subtitleKey="it.departments.noDepts" />
          <LocalizedEmptyState titleKey="emptyDepts" descriptionKey="emptyDeptsDesc" />
        </>
      ) : (
        <DepartmentTable departments={departments} />
      )}
    </div>
  );
}

