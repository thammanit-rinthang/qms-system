
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDepartments } from "@/lib/departmentCache";
import { UnauthorizedError } from "@/lib/errors";
import DashboardClientView from "@/components/dashboard/DashboardClientView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function CompanyCenterDashboard() {
  const session = await requireAuth();
  const now = new Date();
  // currentMonth reserved for future filtering
  const currentYear = now.getFullYear();

  const activeFilter = {
    status: "ACTIVE",
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
  };

  let departmentList;
  try {
    departmentList = await getDepartments(session.user.accessToken);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/api/auth/signout?callbackUrl=/");
    throw e;
  }

  const [
    announcementsList,
    tickerAnnouncements,
    recentPublicDocs,
    departmentDocStats,
    recentAttachments,
    approvedKpisRaw,
  ] = await Promise.all([
    db.announcement.findMany({
      where: activeFilter,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    db.announcement.findMany({
      where: { ...activeFilter, displayType: "SCROLLING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    db.publicDocument.findMany({
      orderBy: { publishedDate: "desc" },
      take: 5,
    }),

    db.documentControl.groupBy({
      by: ["departmentId"],
      _count: { _all: true },
      _max: { updatedAt: true },
      where: { departmentId: { not: null } },
    }),

    db.darAttachment.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),

    db.kPI.findMany({
      where: { yearly: currentYear, status: 'APPROVED', department: { not: 'SYSTEM_MASTER' } },
      select: {
        id: true,
        department: true,
        monthlyReports: {
          select: {
            month: true,
            status: true,
            details: { select: { achievedStatus: true } },
          },
        },
      },
    }),
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  const KPI_MONTHS_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonthName = KPI_MONTHS_ORDER[now.getMonth()];

  const approvedDeptNames = new Set(approvedKpisRaw.map((k) => k.department.toLowerCase()));
  const noKpiDepartments = departmentList
    .filter((d) => !approvedDeptNames.has(d.displayName.toLowerCase()) && !approvedDeptNames.has(d.code.toLowerCase()))
    .map((d) => d.displayName);
  const kpiMatrix = approvedKpisRaw.map((kpi) => {
    const months: Record<string, string | null> = Object.fromEntries(KPI_MONTHS_ORDER.map((m) => [m, null]));
    for (const r of kpi.monthlyReports) months[r.month] = r.status;
    return { department: kpi.department, kpiId: kpi.id, months };
  });

  const notSubmittedThisMonth = approvedKpisRaw
    .filter((kpi) => {
      const report = kpi.monthlyReports.find((r) => r.month === currentMonthName);
      return !report || report.status === 'DRAFT';
    })
    .map((kpi) => ({ department: kpi.department, kpiId: kpi.id }));

  const ngThisMonth = approvedKpisRaw
    .filter((kpi) => {
      const report = kpi.monthlyReports.find((r) => r.month === currentMonthName);
      return report && report.status !== 'DRAFT' && report.details.some((d) => d.achievedStatus === 'NOT_OK');
    })
    .map((kpi) => ({ department: kpi.department, kpiId: kpi.id }));

  const okThisMonth = approvedKpisRaw
    .filter((kpi) => {
      const report = kpi.monthlyReports.find((r) => r.month === currentMonthName);
      return report && report.status !== 'DRAFT' && report.details.every((d) => d.achievedStatus === 'OK');
    })
    .map((kpi) => ({ department: kpi.department, kpiId: kpi.id }));
  const docStatsByDepartment = new Map(
    departmentDocStats
      .filter((row) => row.departmentId)
      .map((row) => [row.departmentId as string, { count: row._count._all, latest: row._max.updatedAt ?? null }]),
  );

  const mappedDepartments = departmentList
    .map((dept) => ({
      id: dept.code,
      name: dept.displayName,
      documentCount: docStatsByDepartment.get(dept.code)?.count ?? 0,
      latestDocUpdatedAt: docStatsByDepartment.get(dept.code)?.latest ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.latestDocUpdatedAt ? new Date(a.latestDocUpdatedAt).getTime() : 0;
      const bTime = b.latestDocUpdatedAt ? new Date(b.latestDocUpdatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .map(({ id, name, documentCount }) => ({ id, name, documentCount }));

  return (
    <DashboardClientView
      canManage={canManage}
      role={session.user.role}
      announcements={announcementsList}
      tickerAnnouncements={tickerAnnouncements}
      recentPublicDocs={recentPublicDocs}
      departments={mappedDepartments}
      recentAttachments={recentAttachments}
kpiMonthlyMatrix={{ year: currentYear, noKpiDepartments, matrix: kpiMatrix, currentMonth: currentMonthName, notSubmittedThisMonth, ngThisMonth, okThisMonth }}
    />
  );
}
