import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarPrintTemplate from "@/components/dar/DarPrintTemplate";
import { db } from "@/lib/db";

const darService = new DarService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dar = await db.darMaster.findUnique({ where: { id }, select: { darNo: true } });
  return { title: dar?.darNo ? `${dar.darNo} — Print` : "Print Request" };
}

export default async function PrintDarPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

  try {
    const dar = await darService.getDarById(id, session.user.id, isPrivileged);
    return <DarPrintTemplate dar={dar} />;
  } catch {
    notFound();
  }
}
