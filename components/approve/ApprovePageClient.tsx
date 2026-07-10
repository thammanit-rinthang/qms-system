"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Clock3, ShieldAlert, CheckCircle2, ClipboardList, PenSquare } from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import { useAppQuery } from "@/hooks/use-app-query";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { fmtDate } from "@/lib/formatters";
import { useUrlFilters } from "@/hooks/use-url-filters";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproveSkeleton } from "./components/ApproveSkeleton";
import { RoleBanner } from "./components/RoleBanner";
import { EmptyState } from "./components/EmptyState";

type PendingDarItem = {
  darId: string;
  darNo: string | null;
  status: string;
  requestDate: string;
  requesterName: string | null;
  stepRole: string;
};

type PendingKpiItem = {
  id: string;
  kpiId: string;
  department: string;
  month: string | null;
  year: number;
  status: string;
  source: "OBJECTIVE" | "MONTHLY";
};

type PendingCarItem = {
  id: string;
  carNo: string;
  status: string;
  targetDepartment: string | null;
  defectDetail: string;
  issuedAt: string | null;
  responseDueAt: string | null;
  updatedAt: string;
  actionType: "MR_REVIEW" | "MR_SIGN";
};

type PendingAuditItem = {
  id: string;
  auditNo: string;
  title: string;
  auditType: string;
  status: string;
  updatedAt: string;
};

type PendingAppointmentItem = {
  id: string;
  appointmentNo: string;
  title: string;
  year: number;
  status: string;
  updatedAt: string;
  actionType: "REVIEW" | "APPROVE";
};

type PendingSummary = {
  totalPending: number;
  pendingDarCount: number;
  pendingKpiReviewCount: number;
  pendingKpiApproveCount: number;
  pendingCarReviewCount: number;
  pendingCarSignCount: number;
  pendingAuditReviewCount: number;
  pendingAuditApproveCount: number;
  pendingAppointmentReviewCount: number;
  pendingAppointmentApproveCount: number;
  pendingDarItems: PendingDarItem[];
  pendingKpiReviewItems: PendingKpiItem[];
  pendingKpiApproveItems: PendingKpiItem[];
  pendingCarReviewItems: PendingCarItem[];
  pendingCarSignItems: PendingCarItem[];
  pendingAuditReviewItems: PendingAuditItem[];
  pendingAuditApproveItems: PendingAuditItem[];
  pendingAppointmentReviewItems: PendingAppointmentItem[];
  pendingAppointmentApproveItems: PendingAppointmentItem[];
};

type QueueModule = "dar" | "kpi" | "car" | "audit" | "appointment";
type QueueRole = "review" | "approval" | "sign-off";

type QueueItem = {
  id: string;
  module: QueueModule;
  role: QueueRole;
  title: string;
  subtitle: string;
  description?: string;
  href: string;
  sortDate: string;
  meta: Array<{ label: string; value: string }>;
};

type Props = {
  userRole: UserRole;
};

export default function ApprovePageClient({ userRole }: Props) {
  const t = useT();
  const locale = useLocale();
  const copy = locale === "en"
    ? {
        pendingReview: "Needs Review",
        pendingApproval: "Needs Approval",
        pendingSignOff: "Needs Sign-off",
        pendingCar: "CAR Pending",
        pendingAudit: "Audit Pending",
        allModules: "All Modules",
        signOff: "Sign-off",
        items: "items",
        queueIntro: "Use the cards below to narrow the queue by action type or module.",
        emptyFiltered: "No approval items match the current filters",
        moduleDarDesc: "Document action requests",
        moduleKpiDesc: "Objectives and monthly KPI reports",
        moduleCarDesc: "MR review and final sign-off",
        moduleAuditDesc: "Internal and external audit plan approvals",
        moduleAppointmentDesc: "Audit appointment letters",
        pendingAppointment: "Appointment Pending",
      }
    : {
        pendingReview: "รอตรวจสอบ",
        pendingApproval: "รออนุมัติ",
        pendingSignOff: "รอลงนาม",
        pendingCar: "CAR รอดำเนินการ",
        pendingAudit: "Audit รอดำเนินการ",
        allModules: "ทุกโมดูล",
        signOff: "ลงนาม",
        items: "รายการ",
        queueIntro: "ใช้การ์ดด้านล่างเพื่อโฟกัสคิวตามประเภทการดำเนินการหรือโมดูล",
        emptyFiltered: "ไม่พบรายการที่ตรงกับตัวกรองปัจจุบัน",
        moduleDarDesc: "คำขอ DAR ที่รอการดำเนินการ",
        moduleKpiDesc: "KPI objective และรายงานรายเดือน",
        moduleCarDesc: "งาน MR review และ sign-off",
        moduleAuditDesc: "แผนการตรวจสอบภายในและภายนอก",
        moduleAppointmentDesc: "ประกาศแต่งตั้งผู้ตรวจ",
        pendingAppointment: "ประกาศแต่งตั้งรอดำเนินการ",
      };

  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "module", "role"],
    searchKey: "search",
  });

  const query = useAppQuery<PendingSummary>({
    queryKey: ["approvals", "pending-summary"],
    realtimeClass: "A",
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending-summary");
      if (!res.ok) throw new Error("Failed to fetch approvals");
      const json = await res.json();
      return (json.data ?? null) as PendingSummary;
    },
  });

  const data = query.data;

  const queueItems = useMemo<QueueItem[]>(() => {
    if (!data) return [];

    const items: QueueItem[] = [];

    for (const item of data.pendingDarItems) {
      const isReview = item.stepRole === "REVIEWER";
      items.push({
        id: `dar-${item.darId}-${item.stepRole}`,
        module: "dar",
        role: isReview ? "review" : "approval",
        title: item.darNo ?? item.darId,
        subtitle: isReview ? t("approve.stepReview") : t("approve.stepApprove"),
        href: `/approve/dar/${item.darId}/${isReview ? "reviewer" : "approver"}`,
        sortDate: item.requestDate,
        meta: [
          { label: t("approve.requester"), value: item.requesterName ?? "-" },
          { label: t("approve.date"), value: fmtDate(item.requestDate, locale) },
        ],
      });
    }

    for (const item of data.pendingKpiReviewItems) {
      items.push({
        id: `kpi-review-${item.id}`,
        module: "kpi",
        role: "review",
        title: item.department,
        subtitle: item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly"),
        description: item.month ? `${item.month} ${item.year}` : String(item.year),
        href:
          item.source === "OBJECTIVE"
            ? `/approve/kpi/${item.kpiId}/reviewer`
            : `/approve/kpi/${item.id}/reviewer?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`,
        sortDate: `${item.year}-${item.month ? String(item.month).padStart(2, "0") : "12"}-01T00:00:00.000Z`,
        meta: [
          { label: t("approve.department"), value: item.department },
          { label: t("approve.period"), value: item.month ? `${item.month} ${item.year}` : String(item.year) },
        ],
      });
    }

    for (const item of data.pendingKpiApproveItems) {
      items.push({
        id: `kpi-approve-${item.id}`,
        module: "kpi",
        role: "approval",
        title: item.department,
        subtitle: item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly"),
        description: item.month ? `${item.month} ${item.year}` : String(item.year),
        href:
          item.source === "OBJECTIVE"
            ? `/approve/kpi/${item.kpiId}/approver`
            : `/approve/kpi/${item.id}/approver?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`,
        sortDate: `${item.year}-${item.month ? String(item.month).padStart(2, "0") : "12"}-01T00:00:00.000Z`,
        meta: [
          { label: t("approve.department"), value: item.department },
          { label: t("approve.period"), value: item.month ? `${item.month} ${item.year}` : String(item.year) },
        ],
      });
    }

    for (const item of data.pendingCarReviewItems) {
      items.push({
        id: `car-review-${item.id}`,
        module: "car",
        role: "review",
        title: item.carNo,
        subtitle: item.targetDepartment ?? "CAR",
        description: item.defectDetail,
        href: `/approve/car/${item.id}/mr-response`,
        sortDate: item.updatedAt,
        meta: [
          { label: t("approve.department"), value: item.targetDepartment ?? "-" },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    for (const item of data.pendingCarSignItems) {
      items.push({
        id: `car-sign-${item.id}`,
        module: "car",
        role: "sign-off",
        title: item.carNo,
        subtitle: item.targetDepartment ?? "CAR",
        description: item.defectDetail,
        href: `/approve/car/${item.id}/mr`,
        sortDate: item.updatedAt,
        meta: [
          { label: t("approve.department"), value: item.targetDepartment ?? "-" },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    for (const item of (data.pendingAuditReviewItems ?? [])) {
      items.push({
        id: `audit-review-${item.id}`,
        module: "audit",
        role: "review",
        title: item.auditNo,
        subtitle: item.title,
        description: item.auditType === "INTERNAL" ? "Internal Audit" : "External Audit",
        href: `/approve/audit/${item.id}/reviewer`,
        sortDate: item.updatedAt,
        meta: [
          { label: "ประเภท", value: item.auditType === "INTERNAL" ? "Internal" : "External" },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    for (const item of (data.pendingAuditApproveItems ?? [])) {
      items.push({
        id: `audit-approve-${item.id}`,
        module: "audit",
        role: "approval",
        title: item.auditNo,
        subtitle: item.title,
        description: item.auditType === "INTERNAL" ? "Internal Audit" : "External Audit",
        href: `/approve/audit/${item.id}/approver`,
        sortDate: item.updatedAt,
        meta: [
          { label: "ประเภท", value: item.auditType === "INTERNAL" ? "Internal" : "External" },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    for (const item of (data.pendingAppointmentReviewItems ?? [])) {
      items.push({
        id: `appointment-review-${item.id}`,
        module: "appointment",
        role: "review",
        title: item.appointmentNo,
        subtitle: item.title,
        description: `ประจำปี พ.ศ. ${item.year}`,
        href: `/approve/audit/appointments/${item.id}/reviewer`,
        sortDate: item.updatedAt,
        meta: [
          { label: "ปี", value: String(item.year) },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    for (const item of (data.pendingAppointmentApproveItems ?? [])) {
      items.push({
        id: `appointment-approve-${item.id}`,
        module: "appointment",
        role: "approval",
        title: item.appointmentNo,
        subtitle: item.title,
        description: `ประจำปี พ.ศ. ${item.year}`,
        href: `/approve/audit/appointments/${item.id}/approver`,
        sortDate: item.updatedAt,
        meta: [
          { label: "ปี", value: String(item.year) },
          { label: t("approve.date"), value: fmtDate(item.updatedAt, locale) },
        ],
      });
    }

    return items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [data, locale, t]);

  const moduleCounts = useMemo(
    () => ({
      all: queueItems.length,
      dar: queueItems.filter((item) => item.module === "dar").length,
      kpi: queueItems.filter((item) => item.module === "kpi").length,
      car: queueItems.filter((item) => item.module === "car").length,
      audit: queueItems.filter((item) => item.module === "audit").length,
      appointment: queueItems.filter((item) => item.module === "appointment").length,
    }),
    [queueItems],
  );

  const roleCounts = useMemo(
    () => ({
      review: queueItems.filter((item) => item.role === "review").length,
      approval: queueItems.filter((item) => item.role === "approval").length,
      signOff: queueItems.filter((item) => item.role === "sign-off").length,
    }),
    [queueItems],
  );

  const filteredItems = useMemo(() => {
    const searchVal = params.search?.toLowerCase().trim() || "";
    return queueItems.filter((item) => {
      if (params.module && item.module !== params.module) return false;
      if (params.role && item.role !== params.role) return false;
      if (!searchVal) return true;

      const haystack = [
        item.title,
        item.subtitle,
        item.description ?? "",
        ...item.meta.map((meta) => `${meta.label} ${meta.value}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchVal);
    });
  }, [params.module, params.role, params.search, queueItems]);

  const groupedItems = useMemo(() => {
    const order: QueueModule[] = ["dar", "kpi", "car", "audit", "appointment"];
    return order
      .map((module) => ({
        module,
        items: filteredItems.filter((item) => item.module === module),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  if (query.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("approve.title")} subtitle={t("approve.subtitle")} />
        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-4 flex justify-center text-rose-600">
            <ShieldAlert className="h-12 w-12 rounded-full bg-rose-50 p-3" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-800">{t("error.title")}</p>
          <p className="mb-4 text-sm text-slate-400">{t("common.errorRetry")}</p>
          <Button onClick={() => query.refetch()} variant="outline">
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("approve.title")} subtitle={t("approve.subtitle")} />

      <RoleBanner role={userRole} />

      {query.isLoading ? (
        <ApproveSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              active={!params.role}
              icon={<Clock3 className="h-5 w-5" />}
              label={t("approve.totalPending")}
              value={data?.totalPending ?? 0}
              tone="slate"
              onClick={() => setParam("role", "")}
            />
            <SummaryCard
              active={params.role === "review"}
              icon={<ClipboardList className="h-5 w-5" />}
              label={copy.pendingReview}
              value={roleCounts.review}
              tone="sky"
              onClick={() => setParam("role", params.role === "review" ? "" : "review")}
            />
            <SummaryCard
              active={params.role === "approval"}
              icon={<CheckCircle2 className="h-5 w-5" />}
              label={copy.pendingApproval}
              value={roleCounts.approval}
              tone="emerald"
              onClick={() => setParam("role", params.role === "approval" ? "" : "approval")}
            />
            <SummaryCard
              active={params.role === "sign-off"}
              icon={<PenSquare className="h-5 w-5" />}
              label={copy.pendingSignOff}
              value={roleCounts.signOff}
              tone="amber"
              onClick={() => setParam("role", params.role === "sign-off" ? "" : "sign-off")}
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t("approve.title")}</h2>
                <p className="text-xs text-slate-500">{copy.queueIntro}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ModuleChip active={!params.module} label={copy.allModules} count={moduleCounts.all} onClick={() => setParam("module", "")} />
                <ModuleChip active={params.module === "dar"} label={t("approve.pendingDar")} count={moduleCounts.dar} onClick={() => setParam("module", params.module === "dar" ? "" : "dar")} />
                <ModuleChip active={params.module === "kpi"} label={t("approve.pendingKpi")} count={moduleCounts.kpi} onClick={() => setParam("module", params.module === "kpi" ? "" : "kpi")} />
                <ModuleChip active={params.module === "car"} label={copy.pendingCar} count={moduleCounts.car} onClick={() => setParam("module", params.module === "car" ? "" : "car")} />
                <ModuleChip active={params.module === "audit"} label={copy.pendingAudit} count={moduleCounts.audit} onClick={() => setParam("module", params.module === "audit" ? "" : "audit")} />
                <ModuleChip active={params.module === "appointment"} label={copy.pendingAppointment} count={moduleCounts.appointment} onClick={() => setParam("module", params.module === "appointment" ? "" : "appointment")} />
              </div>
            </div>

            <FilterBar
              searchValue={rawValues.search}
              onSearchChange={(value) => setParam("search", value)}
              searchPlaceholder={t("common.search")}
              hasActiveFilters={hasFilters}
              onClearAll={clearAll}
              resultCount={filteredItems.length}
              totalCount={queueItems.length}
              countLabel={copy.items}
              className="mb-0"
            />
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState label={hasFilters ? copy.emptyFiltered : t("common.noItems")} />
          ) : (
            <div className="space-y-6">
              {groupedItems.map((group) => (
                <section key={group.module} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {group.module === "dar"
                          ? t("approve.pendingDar")
                          : group.module === "kpi"
                            ? t("approve.pendingKpi")
                            : group.module === "car"
                              ? copy.pendingCar
                              : group.module === "appointment"
                                ? copy.pendingAppointment
                                : copy.pendingAudit}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {group.module === "dar"
                          ? copy.moduleDarDesc
                          : group.module === "kpi"
                            ? copy.moduleKpiDesc
                            : group.module === "car"
                              ? copy.moduleCarDesc
                              : group.module === "appointment"
                                ? copy.moduleAppointmentDesc
                                : copy.moduleAuditDesc}
                      </p>
                    </div>
                    <Badge variant="secondary">{group.items.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <QueueCard key={item.id} item={item} openLabel={t("approve.openAction")} signOffLabel={copy.signOff} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  active,
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  value: number;
  tone: "slate" | "sky" | "emerald" | "amber";
  onClick: () => void;
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    sky: "bg-sky-50 text-sky-600 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-white p-5 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition hover:-translate-y-0.5 ${
        active ? "border-primary ring-1 ring-primary/10" : "border-slate-100"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

function ModuleChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
        active
          ? "border-primary bg-primary text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}

function QueueCard({
  item,
  openLabel,
  signOffLabel,
}: {
  item: QueueItem;
  openLabel: string;
  signOffLabel: string;
}) {
  const moduleBadge =
    item.module === "dar"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : item.module === "kpi"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : item.module === "audit"
          ? "bg-violet-50 text-violet-700 border-violet-200"
          : item.module === "appointment"
            ? "bg-teal-50 text-teal-700 border-teal-200"
            : "bg-rose-50 text-rose-700 border-rose-200";

  const roleLabel =
    item.role === "review"
      ? "Review"
      : item.role === "approval"
        ? "Approval"
        : signOffLabel;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${moduleBadge}`}>
              {item.module.toUpperCase()}
            </span>
            <Badge variant="outline">{roleLabel}</Badge>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
            <p className="text-sm text-slate-600">{item.subtitle}</p>
            {item.description && (
              <p className="line-clamp-2 text-sm text-slate-500">{item.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {item.meta.map((meta) => (
              <span
                key={`${item.id}-${meta.label}`}
                className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
              >
                <span className="mr-1 font-medium text-slate-500">{meta.label}:</span>
                <span>{meta.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end">
          <Button asChild size="sm" className="min-w-28 rounded-xl">
            <Link href={item.href}>{openLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
