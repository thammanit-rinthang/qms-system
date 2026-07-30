
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { DepartmentService } from "@/services/departmentService";
import DarForm from "@/components/dar/DarForm";
import DarEditHeader from "@/components/dar/DarEditHeader";
import { db } from "@/lib/db";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const darService = new DarService();
const deptService = new DepartmentService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dar = await db.darMaster.findUnique({ where: { id }, select: { darNo: true } });
  return { title: dar?.darNo ? `Edit Request ${dar.darNo}` : "Edit Request" };
}

export default async function DarEditPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = isPrivilegedQmsRole(session.user.role);

  let dar;
  try {
    dar = await darService.getDarById(
      id,
      { userId: session.user.id, authUserId: session.user.authUserId ?? null },
      isPrivileged,
    );
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

  // Non-QMS users can only edit DRAFT
  if (!isPrivileged && dar.status !== "DRAFT") redirect(`/dar/${id}`);

  const [departments, savedSig] = await Promise.all([
    deptService.getActiveDepartments(session.user.accessToken),
    darService.getSavedSignature(session.user.id),
  ]);
  const isDraft = dar.status === "DRAFT";

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <DarEditHeader darNo={dar.darNo} darId={id} />
      <DarForm
        mode="edit"
        tempId={id}
        initialData={dar}
        departments={departments}
        hideSubmit={!isDraft}
        requesterInfo={{
          name: dar.requester.name,
          employeeId: dar.requester.employeeId,
          department: dar.requester.department?.name ?? null,
          requestDate: dar.requestDate,
        }}
        savedSignatureUrl={savedSig?.url ?? null}
        savedSignatureType={savedSig?.type ?? null}
      />
    </div>
  );
}
