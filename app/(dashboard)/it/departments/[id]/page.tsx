import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import DepartmentDetailClient from "@/components/it/DepartmentDetailClient";
import { getDepartmentByCode } from "@/lib/departmentCache";

const deptService = new DepartmentService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dept = await getDepartmentByCode(id); // cache-only in metadata context
  return { title: dept ? `${dept.displayName} — Department Details` : "Department Details" };
}

export default async function DepartmentDetailPage({ params }: Props) {
  const session = await requireRole("IT");
  const { id } = await params;
  const dept = await deptService.getDepartmentWithMembers(id, session.user.accessToken);
  if (!dept) notFound();

  return <DepartmentDetailClient dept={dept} />;
}
