import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import DarPrintTemplate from "@/components/dar/DarPrintTemplate";
import { db } from "@/lib/db";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const darService = new DarService();
const qmsConfigService = new QmsConfigService();
const departmentCodeRepo = new DepartmentCodeRepository();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [dar, footerConfig] = await Promise.all([
    db.darMaster.findUnique({ where: { id }, select: { darNo: true } }),
    qmsConfigService.getSingleFooterConfig("DAR"),
  ]);

  const prefix = footerConfig.prefix.trim() || "FM-DC-01";
  return { title: dar?.darNo ? `${dar.darNo} - ${prefix}` : prefix };
}

export default async function PrintDarPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = isPrivilegedQmsRole(session.user.role);

  try {
    const [dar, footerConfig, departmentCodes] = await Promise.all([
      darService.getDarById(
        id,
        { userId: session.user.id, authUserId: session.user.authUserId ?? null },
        isPrivileged,
      ),
      qmsConfigService.getSingleFooterConfig("DAR"),
      departmentCodeRepo.findAll(),
    ]);
    const departmentCodeMap = Object.fromEntries(departmentCodes.map((d) => [d.authDeptId, d.code]));
    return <DarPrintTemplate dar={dar} footerConfig={footerConfig} departmentCodeMap={departmentCodeMap} />;
  } catch (error) {
    const err = error as { statusCode?: number; errorCode?: string; name?: string };
    if (
      err?.name === "ForbiddenError" ||
      err?.statusCode === 403 ||
      err?.errorCode === "FORBIDDEN"
    ) {
      redirect("/dar");
    }
    notFound();
  }
}
