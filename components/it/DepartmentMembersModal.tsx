"use client";

import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import type { DepartmentDetail } from "@/types/department";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  departmentId: string | null;
  open: boolean;
  onClose: () => void;
};

const ROLE_BADGE = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-600",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-sky-50 text-sky-600 border border-sky-200",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-amber-50 text-amber-600 border border-amber-200",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200",
} as const;

export default function DepartmentMembersModal({ departmentId, open, onClose }: Props) {
  const t = useT();

  const { data, isLoading, error, refetch } = useQuery<{ data: DepartmentDetail }>({
    queryKey: ["department-members", departmentId],
    queryFn: async () => {
      const res = await fetch(`/api/it/departments/${departmentId}/members`);
      if (!res.ok) throw new Error("Failed to fetch department members");
      return res.json();
    },
    enabled: !!departmentId && open,
  });

  const dept = data?.data;

  // Count active / connected M365 members
  const totalMembers = dept?.members.length ?? 0;
  const connectedM365 = dept?.members.filter((m) => m.msUserId).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-full sm:max-w-3xl lg:max-w-4xl p-6 rounded-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle asChild>
            <div className="text-xl font-bold tracking-tight text-[#0F1059]">
              {isLoading ? (
                <Skeleton className="h-6 w-48 rounded-lg" />
              ) : dept ? (
                dept.name
              ) : (
                t("it.departments.title")
              )}
            </div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-slate-500 font-medium">
              {isLoading ? (
                <Skeleton className="h-4 w-32 rounded-lg mt-1" />
              ) : dept ? (
                <>
                  {dept.emailGroup ? dept.emailGroup : t("it.departments.noGroupEmail")}
                  {` · `}
                  <span className={dept.isActive ? "text-emerald-600 font-semibold" : "text-slate-400 font-semibold"}>
                    {dept.isActive ? t("it.departments.active") : t("it.departments.inactive")}
                  </span>
                </>
              ) : (
                t("it.departments.manage")
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-slate-800 font-semibold text-sm">{t("common.error")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
              {t("common.retry")}
            </Button>
          </div>
        )}

        {dept && !isLoading && !error && (
          <div className="space-y-4">
            {/* Quick stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <span className="text-xs text-slate-500 font-medium">{t("it.departments.membersAll")}</span>
                <span className="text-2xl font-bold text-[#0F1059] mt-1">
                  {totalMembers} <span className="text-sm font-normal text-slate-500">{t("it.departments.membersAllUnit")}</span>
                </span>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <span className="text-xs text-slate-500 font-medium">{t("it.departments.connectedM365")}</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1">
                  {connectedM365} <span className="text-sm font-normal text-slate-500">{t("it.departments.membersAllUnit")}</span>
                </span>
              </div>
            </div>

            {/* Members List Container */}
            {dept.members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                <p className="text-slate-800 font-semibold text-sm">{t("it.departments.emptyMembers")}</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">{t("it.departments.emptyMembersDesc")}</p>
              </div>
            ) : (
              <>
                {/* Desktop View (>= lg) */}
                <div className="hidden lg:block border border-slate-100 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="w-12 text-slate-800 font-semibold text-center">{t("dar.table.colNo")}</TableHead>
                        <TableHead className="text-slate-800 font-semibold">{t("it.departments.colName")}</TableHead>
                        <TableHead className="text-slate-800 font-semibold">{t("it.departments.colEmail")}</TableHead>
                        <TableHead className="text-slate-800 font-semibold">{t("it.departments.colEmpId")}</TableHead>
                        <TableHead className="text-slate-800 font-semibold">{t("it.departments.colRole")}</TableHead>
                        <TableHead className="text-slate-800 font-semibold text-center">{t("it.departments.colM365")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dept.members.map((member, idx) => (
                        <TableRow key={member.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-slate-800 text-sm">{member.name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{member.email}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{member.employeeId ?? "—"}</TableCell>
                          <TableCell>
                            <span className={ROLE_BADGE[member.role] || ROLE_BADGE.USER}>
                              {t(`roles.${member.role}`)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {member.msUserId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {t("it.departments.connected")}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View (< lg) */}
                <div className="lg:hidden flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {dept.members.map((member) => (
                    <div key={member.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{member.name ?? "—"}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{member.email}</p>
                        </div>
                        <span className={ROLE_BADGE[member.role] || ROLE_BADGE.USER}>
                          {t(`roles.${member.role}`)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-2 gap-2">
                        <span>{t("it.departments.empIdPrefix")}: <span className="font-mono font-medium text-slate-700">{member.employeeId ?? "—"}</span></span>
                        <span>
                          {t("it.departments.m365Prefix")}:{" "}
                          {member.msUserId ? (
                            <span className="text-emerald-600 font-semibold">{t("it.departments.connected")}</span>
                          ) : (
                            <span className="text-slate-400 font-medium">{t("it.departments.notConnected")}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
