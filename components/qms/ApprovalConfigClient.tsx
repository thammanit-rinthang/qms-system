"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileCheck2,
  FileText,
  ShieldCheck,
  ClipboardList,
  CalendarCheck2,
  BarChart3,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApprovalConfigModuleKey } from "@/lib/approval-config";

interface UserOption {
  id: string;
  authUserId: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface ModuleConfig {
  moduleKey: ApprovalConfigModuleKey;
  label: string;
  description: string;
  mrAuthUserId: string | null;
  qmsAuthUserId: string | null;
  mrEmail: string | null;
  qmsEmail: string | null;
}

interface ConfigResponse {
  users: UserOption[];
  modules: ModuleConfig[];
}

type ModuleSelectionState = Record<
  ApprovalConfigModuleKey,
  { mrAuthUserId: string; qmsAuthUserId: string }
>;

const MODULE_ICONS: Record<ApprovalConfigModuleKey, typeof FileText> = {
  DAR: FileText,
  CAR: FileCheck2,
  KPI: BarChart3,
  KPI_MONTHLY: ClipboardList,
  AUDIT_APPOINTMENT: CalendarCheck2,
  AUDIT: ShieldCheck,
};

/** Thai label override per module — English label comes from the API (module.label) */
const MODULE_LABEL_TH: Record<ApprovalConfigModuleKey, string> = {
  DAR: "คำขอเอกสาร",
  CAR: "คำขอแก้ไข",
  KPI: "KPI ประจำปี",
  KPI_MONTHLY: "KPI รายเดือน",
  AUDIT_APPOINTMENT: "การแต่งตั้งผู้ตรวจ",
  AUDIT: "แผนการตรวจ",
};

const MODULE_DESC_TH: Record<ApprovalConfigModuleKey, string> = {
  DAR: "Document Action Request",
  CAR: "Corrective Action Request",
  KPI: "การอนุมัติ KPI ประจำปี",
  KPI_MONTHLY: "การอนุมัติรายงาน KPI ประจำเดือน",
  AUDIT_APPOINTMENT: "การอนุมัติการแต่งตั้งผู้ตรวจสอบ",
  AUDIT: "การอนุมัติแผนการตรวจติดตาม",
};

const EMPTY_OPTION = "__empty__";

export default function ApprovalConfigClient() {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<ModuleSelectionState>({
    DAR: { mrAuthUserId: "", qmsAuthUserId: "" },
    CAR: { mrAuthUserId: "", qmsAuthUserId: "" },
    KPI: { mrAuthUserId: "", qmsAuthUserId: "" },
    KPI_MONTHLY: { mrAuthUserId: "", qmsAuthUserId: "" },
    AUDIT_APPOINTMENT: { mrAuthUserId: "", qmsAuthUserId: "" },
    AUDIT: { mrAuthUserId: "", qmsAuthUserId: "" },
  });

  const [savingModules, setSavingModules] = useState<
    Partial<Record<ApprovalConfigModuleKey, boolean>>
  >({});

  const { data, isLoading, error } = useQuery<ConfigResponse>({
    queryKey: ["qms-approval-config"],
    queryFn: async () => {
      const res = await fetch("/api/qms/approval-config");
      if (!res.ok) {
        throw new Error("ไม่สามารถโหลดการตั้งค่าการอนุมัติได้ / Failed to load approval configuration");
      }
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setSelections((prev) => {
      const next = { ...prev };
      for (const mod of data.modules) {
        next[mod.moduleKey] = {
          mrAuthUserId: mod.mrAuthUserId ?? "",
          qmsAuthUserId: mod.qmsAuthUserId ?? "",
        };
      }
      return next;
    });
  }, [data]);

  const mrOptions = useMemo(() => {
    if (!data) return [];
    const filtered = data.users.filter((user) => user.role === "MR");
    return filtered.length > 0 ? filtered : data.users;
  }, [data]);

  const qmsOptions = useMemo(() => {
    if (!data) return [];
    const filtered = data.users.filter((user) => user.role === "QMS");
    return filtered.length > 0 ? filtered : data.users;
  }, [data]);

  const saveModuleMutation = useMutation({
    mutationFn: async (moduleKey: ApprovalConfigModuleKey) => {
      if (!data) {
        throw new Error("ยังไม่ได้โหลดข้อมูลการตั้งค่า / Approval configuration is not loaded");
      }

      const mod = data.modules.find((m) => m.moduleKey === moduleKey);
      if (!mod) throw new Error(`Module ${moduleKey} not found`);

      const selectedMr = data.users.find(
        (user) => user.authUserId === selections[moduleKey].mrAuthUserId,
      );
      const selectedQms = data.users.find(
        (user) => user.authUserId === selections[moduleKey].qmsAuthUserId,
      );

      const payload = {
        modules: [
          {
            moduleKey,
            mrAuthUserId: selections[moduleKey].mrAuthUserId || null,
            qmsAuthUserId: selections[moduleKey].qmsAuthUserId || null,
            mrEmail: selectedMr?.email ?? null,
            qmsEmail: selectedQms?.email ?? null,
          },
        ],
      };

      const res = await fetch("/api/qms/approval-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "ไม่สามารถบันทึกการตั้งค่าได้ / Failed to save configuration");
      }

      return moduleKey;
    },
    onMutate: (moduleKey) => {
      setSavingModules((prev) => ({ ...prev, [moduleKey]: true }));
    },
    onSuccess: (moduleKey) => {
      queryClient.invalidateQueries({ queryKey: ["qms-approval-config"] });
      const label = MODULE_LABEL_TH[moduleKey];
      toast.success(`บันทึกการตั้งค่า ${label} เรียบร้อยแล้ว`);
    },
    onError: (err: Error, moduleKey) => {
      toast.error(err.message ?? "ไม่สามารถบันทึกการตั้งค่าได้ / Failed to save configuration");
      setSavingModules((prev) => ({ ...prev, [moduleKey]: false }));
    },
    onSettled: (_data, _err, moduleKey) => {
      setSavingModules((prev) => ({ ...prev, [moduleKey]: false }));
    },
  });

  function updateSelection(
    moduleKey: ApprovalConfigModuleKey,
    role: "MR" | "QMS",
    value: string,
  ) {
    setSelections((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        mrAuthUserId: role === "MR" ? value : prev[moduleKey].mrAuthUserId,
        qmsAuthUserId: role === "QMS" ? value : prev[moduleKey].qmsAuthUserId,
      },
    }));
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error?.message ?? "ไม่สามารถโหลดการตั้งค่าการอนุมัติได้ / Failed to load approval configuration"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          การตั้งค่าผู้อนุมัติรายโมดูล
          <span className="ml-2 text-lg font-medium text-slate-500">
            (Approval Configuration by Module)
          </span>
        </h1>
        <p className="text-sm text-slate-500">
          กำหนด QMS Reviewer และ MR Approver สำหรับกระบวนการอนุมัติของแต่ละโมดูล
          <span className="ml-1 text-slate-400">
            — Set the QMS Reviewer and MR Approver for each module&apos;s approval workflow.
          </span>
        </p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {data.modules.map((module) => {
          const Icon = MODULE_ICONS[module.moduleKey];
          const isSaving = savingModules[module.moduleKey] ?? false;
          const labelTh = MODULE_LABEL_TH[module.moduleKey];
          const descTh = MODULE_DESC_TH[module.moduleKey];

          return (
            <Card
              key={module.moduleKey}
              className="rounded-xl border-slate-200 shadow-sm"
            >
              <CardHeader className="flex flex-row items-start gap-3 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F1059]/10 text-[#0F1059]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {labelTh}
                    <span className="ml-1.5 text-sm font-normal text-slate-500">
                      ({module.label})
                    </span>
                  </CardTitle>
                  <p className="text-xs text-slate-400">{descTh}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* QMS Reviewer */}
                <div className="space-y-1.5">
                  <Label htmlFor={`${module.moduleKey}-qms`} className="text-sm font-medium text-slate-700">
                    QMS Reviewer
                    <span className="ml-1 text-xs font-normal text-slate-400">(ผู้ตรวจสอบ QMS)</span>
                  </Label>
                  <Select
                    value={selections[module.moduleKey].qmsAuthUserId || EMPTY_OPTION}
                    onValueChange={(value) =>
                      updateSelection(
                        module.moduleKey,
                        "QMS",
                        value === EMPTY_OPTION ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id={`${module.moduleKey}-qms`}
                      className="rounded-lg border-slate-200"
                    >
                      <SelectValue placeholder="ใช้ค่าเริ่มต้น / Auth Center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_OPTION}>
                        ใช้ค่าเริ่มต้น / Auth Center
                      </SelectItem>
                      {qmsOptions.map((user) => (
                        <SelectItem
                          key={`${module.moduleKey}-qms-${user.authUserId}`}
                          value={user.authUserId}
                        >
                          {user.name || user.email || user.authUserId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* MR Approver */}
                <div className="space-y-1.5">
                  <Label htmlFor={`${module.moduleKey}-mr`} className="text-sm font-medium text-slate-700">
                    MR Approver
                    <span className="ml-1 text-xs font-normal text-slate-400">(ผู้อนุมัติ MR)</span>
                  </Label>
                  <Select
                    value={selections[module.moduleKey].mrAuthUserId || EMPTY_OPTION}
                    onValueChange={(value) =>
                      updateSelection(
                        module.moduleKey,
                        "MR",
                        value === EMPTY_OPTION ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id={`${module.moduleKey}-mr`}
                      className="rounded-lg border-slate-200"
                    >
                      <SelectValue placeholder="ใช้ค่าเริ่มต้น / Auth Center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_OPTION}>
                        ใช้ค่าเริ่มต้น / Auth Center
                      </SelectItem>
                      {mrOptions.map((user) => (
                        <SelectItem
                          key={`${module.moduleKey}-mr-${user.authUserId}`}
                          value={user.authUserId}
                        >
                          {user.name || user.email || user.authUserId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Per-Module Save Button */}
                <div className="border-t border-slate-100 pt-3">
                  <Button
                    id={`btn-save-${module.moduleKey}`}
                    onClick={() => saveModuleMutation.mutate(module.moduleKey)}
                    disabled={isSaving}
                    className="w-full h-9 rounded-lg bg-[#0F1059] text-sm text-white hover:bg-[#161875] disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังบันทึก... (Saving...)
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        บันทึก (Save)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
