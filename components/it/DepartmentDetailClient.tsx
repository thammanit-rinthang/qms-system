"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import type { DepartmentDetail } from "@/types/department";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_BADGE = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-info/15 text-info",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-warning/15 text-warning",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success",
} as const;

type Props = {
  dept: DepartmentDetail;
};

export default function DepartmentDetailClient({ dept }: Props) {
  const t = useT();

  const subtitle = [
    dept.emailGroup ?? t("it.departments.noGroupEmail"),
    dept.isActive ? t("it.departments.active") : t("it.departments.inactive"),
  ].join(" · ");

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Page header with breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral mb-3">
        <Link href="/it/departments" className="hover:text-primary transition-colors">
          {t("it.departments.title")}
        </Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium text-base-content">{dept.name}</span>
      </nav>

      <PageHeader
        title={dept.name}
        subtitle={subtitle}
        className="mb-6"
        actions={
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link href="/it/departments">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">{t("it.departments.membersAll")}</p>
          <p className="text-[24px] font-semibold text-base-content">{dept.members.length}</p>
          <p className="text-[12px] text-neutral">{t("it.departments.membersAllUnit")}</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">{t("it.departments.connectedM365")}</p>
          <p className="text-[24px] font-semibold text-success">
            {dept.members.filter((m) => m.msUserId).length}
          </p>
          <p className="text-[12px] text-neutral">{t("it.departments.membersAllUnit")}</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">{t("it.departments.hasEmpId")}</p>
          <p className="text-[24px] font-semibold text-base-content">
            {dept.members.filter((m) => m.employeeId).length}
          </p>
          <p className="text-[12px] text-neutral">{t("it.departments.membersAllUnit")}</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">{t("it.departments.specialRole")}</p>
          <p className="text-[24px] font-semibold text-base-content">
            {dept.members.filter((m) => m.role !== "USER").length}
          </p>
          <p className="text-[11px] md:text-xs text-neutral">{t("it.departments.specialRoleHint")}</p>
        </div>
      </div>

      {/* Members */}
      {dept.members.length === 0 ? (
        <EmptyState
          title={t("it.departments.emptyMembers")}
          description={t("it.departments.emptyMembersDesc")}
          ctaLabel={t("it.departments.goToUsers")}
          ctaHref="/it/users"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card-premium overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100">
                  <TableHead className="th-pro">{t("dar.table.colNo")}</TableHead>
                  <TableHead className="th-pro">{t("it.departments.colName")}</TableHead>
                  <TableHead className="th-pro">{t("it.departments.colEmail")}</TableHead>
                  <TableHead className="th-pro">{t("it.departments.colEmpId")}</TableHead>
                  <TableHead className="th-pro">{t("it.departments.colRole")}</TableHead>
                  <TableHead className="th-pro">{t("it.departments.colM365")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dept.members.map((member, idx) => (
                  <TableRow key={member.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors duration-100">
                    <TableCell className="text-[11px] md:text-xs text-neutral">{idx + 1}</TableCell>
                    <TableCell className="text-xs md:text-sm font-semibold text-neutral">{member.name ?? "—"}</TableCell>
                    <TableCell className="text-[11px] md:text-xs text-neutral">{member.email}</TableCell>
                    <TableCell className="text-[11px] md:text-xs text-neutral">
                      {member.employeeId ?? <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={ROLE_BADGE[member.role]}>
                        {t(`roles.${member.role}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.msUserId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {t("it.departments.connected")}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {dept.members.map((member) => (
              <div key={member.id} className="card-premium p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[14px] font-medium">{member.name ?? "—"}</p>
                    <p className="text-[12px] text-neutral">{member.email}</p>
                  </div>
                  <span className={`shrink-0 ${ROLE_BADGE[member.role]}`}>
                    {t(`roles.${member.role}`)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[13px] text-neutral flex-wrap">
                  <span>{t("it.departments.empIdPrefix")}: {member.employeeId ?? "—"}</span>
                  <span>·</span>
                  <span>
                    {t("it.departments.m365Prefix")}:{" "}
                    {member.msUserId
                      ? <span className="text-success font-medium">{t("it.departments.connected")}</span>
                      : t("it.departments.notConnected")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
