"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Filter,
  Calendar,
  Building2,
  FileText,
  ClipboardCheck,
  BarChart3,
  Search,
  X,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  DonutChart,
  KpiPerformanceChart,
  type ChartDataItem,
} from "./SummaryCharts";
import { DOC_TYPE_LABELS, OBJECTIVE_LABELS } from "@/types/dar";
import type { QmsSummaryData } from "@/services/qmsSummaryService";

interface QmsSummaryClientProps {
  initialData: QmsSummaryData;
}

export default function QmsSummaryClient({ initialData }: QmsSummaryClientProps) {
  const {
    dars,
    cars,
    kpis,
    auditFindings,
    deptCodes,
    kpiDepts,
    docDepts,
    pendingCount,
    pendingDarCount,
    pendingCarCount,
  } = initialData;

  // ---------------------------------------------------------
  // Department Resolver Helper
  // ---------------------------------------------------------
  const resolveDept = useMemo(() => {
    const memoMap = new Map<string, string>();
    return (cleanVal: string | null | undefined): string => {
      if (!cleanVal) return "ไม่ระบุแผนก";
      const clean = cleanVal.trim();
      if (memoMap.has(clean)) return memoMap.get(clean)!;

      // Match in deptCodes
      const matched = deptCodes.find(
        (d) =>
          d.authDeptId === clean ||
          d.code === clean ||
          d.departmentName.toLowerCase() === clean.toLowerCase()
      );
      if (matched) {
        memoMap.set(clean, matched.departmentName);
        return matched.departmentName;
      }

      // Match in kpiDepts
      const matchedKpi = kpiDepts.find(
        (d) => d.name.toLowerCase() === clean.toLowerCase() || d.authDeptCode === clean
      );
      if (matchedKpi) {
        memoMap.set(clean, matchedKpi.name);
        return matchedKpi.name;
      }

      // Match in docDepts
      const matchedDoc = docDepts.find(
        (d) => d.name.toLowerCase() === clean.toLowerCase() || d.authDeptCode === clean
      );
      if (matchedDoc) {
        memoMap.set(clean, matchedDoc.name);
        return matchedDoc.name;
      }

      memoMap.set(clean, clean);
      return clean;
    };
  }, [deptCodes, kpiDepts, docDepts]);

  // ---------------------------------------------------------
  // Filters State
  // ---------------------------------------------------------
  const currentYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedForm, setSelectedForm] = useState<string>("ALL");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"dar" | "car" | "kpi" | "audit">("dar");

  const hasActiveFilters = selectedYear !== currentYear || selectedDept !== "ALL" || selectedForm !== "ALL" || selectedPurpose !== "ALL";

  const clearAllFilters = useCallback(() => {
    setSelectedYear(currentYear);
    setSelectedDept("ALL");
    setSelectedForm("ALL");
    setSelectedPurpose("ALL");
  }, [currentYear]);

  // ---------------------------------------------------------
  // Excel Export Selection State
  // ---------------------------------------------------------
  const [isExportMode, setIsExportMode] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<Record<string, boolean>>({
    dar_by_dept: true,
    dar_by_status: true,
    dar_by_type: true,
    car_status: true,
    car_by_dept: true,
    car_overdue: true,
    kpi_pass_fail: true,
    kpi_perf: true,
    audit_dept: true,
    audit_category: true,
    audit_status: true,
  });

  const toggleChartSelection = (chartId: string) => {
    setSelectedCharts((prev) => ({
      ...prev,
      [chartId]: !prev[chartId],
    }));
  };

  const handleSelectAllCharts = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    Object.keys(selectedCharts).forEach((k) => {
      updated[k] = select;
    });
    setSelectedCharts(updated);
  };

  const handleExportExcel = async () => {
    if (isExportingExcel) return;

    setIsExportingExcel(true);
    try {
      const response = await fetch("/api/qms/summary/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          department: selectedDept,
          form: selectedForm,
          purpose: selectedPurpose,
          dars: filteredDars,
          cars: filteredCars,
          kpis: filteredKpis,
          auditFindings: filteredAuditFindings,
          module: activeTab,
        }),
      });

      if (!response.ok) throw new Error("Excel export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QMS-Summary-${selectedYear}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export QMS summary Excel", error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ---------------------------------------------------------
  // Filter Options Setup
  // ---------------------------------------------------------
  const years = useMemo(() => {
    const allYears = new Set<number>();
    dars.forEach((d) => allYears.add(new Date(d.requestDate).getFullYear()));
    cars.forEach((c) => {
      if (c.issuedAt) allYears.add(new Date(c.issuedAt).getFullYear());
      allYears.add(new Date(c.createdAt).getFullYear());
    });
    kpis.forEach((k) => allYears.add(k.monthlyReport.year));
    auditFindings.forEach((f) => allYears.add(new Date(f.createdAt).getFullYear()));

    const currentYear = new Date().getFullYear();
    allYears.add(currentYear);

    return Array.from(allYears).sort((a, b) => b - a);
  }, [dars, cars, kpis, auditFindings]);

  const departments = useMemo(() => {
    const allDepts = new Set<string>();
    dars.forEach((d) =>
      allDepts.add(resolveDept(d.authDepartmentId || d.departmentId || d.requesterDepartmentName))
    );
    cars.forEach((c) =>
      allDepts.add(resolveDept(c.targetAuthDepartmentId || c.targetDepartmentName))
    );
    kpis.forEach((k) => allDepts.add(resolveDept(k.monthlyReport.kpi.department)));
    auditFindings.forEach((f) => allDepts.add(resolveDept(f.departmentId)));

    return Array.from(allDepts)
      .filter((d) => d !== "ไม่ระบุแผนก")
      .sort();
  }, [dars, cars, kpis, auditFindings, resolveDept]);

  // ---------------------------------------------------------
  // Filtered Datasets
  // ---------------------------------------------------------
  const filteredDars = useMemo(() => {
    return dars.filter((d) => {
      const yearMatches =
        selectedYear === "ALL" || new Date(d.requestDate).getFullYear() === Number(selectedYear);
      const deptMatches =
        selectedDept === "ALL" ||
        resolveDept(d.authDepartmentId || d.departmentId || d.requesterDepartmentName) ===
          selectedDept;
      const formMatches =
        selectedForm === "ALL" || d.docType === selectedForm;
      const purposeMatches =
        selectedPurpose === "ALL" || d.objective === selectedPurpose;
      return yearMatches && deptMatches && formMatches && purposeMatches;
    });
  }, [dars, selectedYear, selectedDept, selectedForm, selectedPurpose, resolveDept]);

  const filteredCars = useMemo(() => {
    return cars.filter((c) => {
      const carYear = c.issuedAt ? new Date(c.issuedAt).getFullYear() : new Date(c.createdAt).getFullYear();
      const yearMatches = selectedYear === "ALL" || carYear === Number(selectedYear);
      const deptMatches =
        selectedDept === "ALL" ||
        resolveDept(c.targetAuthDepartmentId || c.targetDepartmentName) === selectedDept;
      return yearMatches && deptMatches;
    });
  }, [cars, selectedYear, selectedDept, resolveDept]);

  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => {
      const yearMatches = selectedYear === "ALL" || k.monthlyReport.year === Number(selectedYear);
      const deptMatches =
        selectedDept === "ALL" || resolveDept(k.monthlyReport.kpi.department) === selectedDept;
      return yearMatches && deptMatches;
    });
  }, [kpis, selectedYear, selectedDept, resolveDept]);

  const filteredAuditFindings = useMemo(() => {
    return auditFindings.filter((f) => {
      const yearMatches =
        selectedYear === "ALL" || new Date(f.createdAt).getFullYear() === Number(selectedYear);
      const deptMatches = selectedDept === "ALL" || resolveDept(f.departmentId) === selectedDept;
      return yearMatches && deptMatches;
    });
  }, [auditFindings, selectedYear, selectedDept, resolveDept]);

  // ---------------------------------------------------------
  // Calculations: DAR Summary
  // ---------------------------------------------------------
  const darByDeptData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredDars.forEach((d) => {
      const name = resolveDept(d.authDepartmentId || d.departmentId || d.requesterDepartmentName);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDars, resolveDept]);

  const darByStatusData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredDars.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });

    const DAR_STATUS_LABELS: Record<string, string> = {
      DRAFT: "ฉบับร่าง",
      PENDING_REVIEW: "รอผู้ตรวจสอบ",
      PENDING_APPROVAL: "รอผู้อนุมัติ",
      APPROVED: "อนุมัติแล้ว",
      REJECTED: "ตีกลับ",
      CANCELLED: "ยกเลิก",
      ISSUED: "ออกเลขแล้ว",
      COMPLETED: "เสร็จสิ้น",
    };

    return Object.entries(counts).map(([label, value]) => ({
      label: DAR_STATUS_LABELS[label] || label,
      value,
    }));
  }, [filteredDars]);

  const darByDocTypeData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredDars.forEach((d) => {
      counts[d.docType] = (counts[d.docType] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [filteredDars]);

  // ---------------------------------------------------------
  // Calculations: CAR Summary
  // ---------------------------------------------------------
  const carStatusData = useMemo((): ChartDataItem[] => {
    let openCount = 0;
    let closedCount = 0;
    filteredCars.forEach((c) => {
      if (c.status === "CLOSED" || c.status === "CANCELLED") {
        closedCount++;
      } else {
        openCount++;
      }
    });
    return [
      { label: "เปิดค้างไว้ (Open)", value: openCount, color: "#f59e0b" },
      { label: "ปิดสำเร็จ (Closed)", value: closedCount, color: "#10b981" },
    ];
  }, [filteredCars]);

  const carByDeptData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredCars.forEach((c) => {
      const name = resolveDept(c.targetAuthDepartmentId || c.targetDepartmentName);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCars, resolveDept]);

  const carOverdueData = useMemo((): ChartDataItem[] => {
    let overdueCount = 0;
    let onTimeCount = 0;
    const now = new Date();
    filteredCars.forEach((c) => {
      if (c.status !== "CLOSED" && c.status !== "CANCELLED") {
        if (c.responseDueAt && new Date(c.responseDueAt) < now) {
          overdueCount++;
        } else {
          onTimeCount++;
        }
      }
    });
    return [
      { label: "ล่าช้ากว่ากำหนด (Overdue)", value: overdueCount, color: "#f43f5e" },
      { label: "ปกติ / ยังไม่เลยกำหนด", value: onTimeCount, color: "#0284c7" },
    ];
  }, [filteredCars]);

  // ---------------------------------------------------------
  // Calculations: KPI Summary
  // ---------------------------------------------------------
  const kpiMonthlyPerformance = useMemo((): ChartDataItem[] => {
    // Group achievement results by month
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const grouped: Record<string, { actualTotal: number; targetTotal: number; count: number }> = {};

    months.forEach((m) => {
      grouped[m] = { actualTotal: 0, targetTotal: 0, count: 0 };
    });

    filteredKpis.forEach((k) => {
      const m = k.monthlyReport.month.substring(0, 3); // Get Jan, Feb, etc.
      if (grouped[m]) {
        grouped[m].actualTotal += k.actualResult || 0;
        grouped[m].targetTotal += k.kpiObjective.target;
        grouped[m].count += 1;
      }
    });

    return months.map((m) => {
      const grp = grouped[m];
      const avgActual = grp.count > 0 ? Math.round((grp.actualTotal / grp.count) * 10) / 10 : 0;
      const avgTarget = grp.count > 0 ? Math.round((grp.targetTotal / grp.count) * 10) / 10 : 0;
      return {
        label: m,
        value: avgActual,
        secondaryValue: avgTarget,
      };
    });
  }, [filteredKpis]);

  const kpiPassFailData = useMemo((): ChartDataItem[] => {
    let okCount = 0;
    let notOkCount = 0;
    filteredKpis.forEach((k) => {
      if (k.achievedStatus === "OK") {
        okCount++;
      } else if (k.achievedStatus === "NOT_OK") {
        notOkCount++;
      }
    });
    return [
      { label: "ผ่านเป้าหมาย (Pass)", value: okCount, color: "#10b981" },
      { label: "ไม่ผ่านเป้าหมาย (Fail)", value: notOkCount, color: "#f43f5e" },
    ];
  }, [filteredKpis]);

  // ---------------------------------------------------------
  // Calculations: Audit Summary
  // ---------------------------------------------------------
  const auditFindingsDeptData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredAuditFindings.forEach((f) => {
      const name = resolveDept(f.departmentId);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAuditFindings, resolveDept]);

  const auditFindingsCategoryData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredAuditFindings.forEach((f) => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [filteredAuditFindings]);

  const auditFindingsStatusData = useMemo((): ChartDataItem[] => {
    const counts: Record<string, number> = {};
    filteredAuditFindings.forEach((f) => {
      counts[f.status] = (counts[f.status] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [filteredAuditFindings]);

  return (
    <div className="space-y-6">
      {/* 1. Header (Normal Mode) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1059] via-[#17186f] to-[#25277f] px-5 py-6 text-white shadow-[0_14px_36px_rgba(15,16,89,0.2)] md:px-7 no-print">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Quality Management System</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6 text-cyan-300" />
            หน้าสรุปผลภาพรวมระบบ QMS
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-blue-100/75">
            ระบบรายงานสถิติและข้อมูลภาพรวมของ DAR, CAR, KPI และผลการตรวจสอบ (Audit)
          </p>
        </div>

        <div className="hidden">
          {!isExportMode ? (
            <Button onClick={() => setIsExportMode(true)} className="bg-white text-[#0F1059] hover:bg-blue-50">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              เตรียมส่งออก Excel
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Button onClick={() => handleSelectAllCharts(true)} variant="ghost" size="sm" className="text-xs">
                เลือกทั้งหมด
              </Button>
              <Button onClick={() => handleSelectAllCharts(false)} variant="ghost" size="sm" className="text-xs">
                ล้างทั้งหมด
              </Button>
              <Button onClick={handleExportExcel} disabled={isExportingExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExportingExcel ? "กำลังสร้าง Excel..." : "ดาวน์โหลด Excel"}
              </Button>
              <Button
                onClick={() => setIsExportMode(false)}
                variant="outline"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 no-print">
        {[
          { label: "DAR ที่ต้องติดตาม", value: pendingDarCount, href: "/qms/dar", tone: "text-amber-700", icon: FileText },
          { label: "CAR ที่ต้องติดตาม", value: pendingCarCount, href: "/qms/car", tone: "text-rose-700", icon: ClipboardCheck },
          { label: "ดู KPI รายเดือน", value: filteredKpis.length, href: "/qms/kpi/monthly", tone: "text-[#0F1059]", icon: BarChart3 },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
            <span className="flex items-center gap-3"><span className="rounded-xl bg-slate-50 p-2"><item.icon className={`h-4 w-4 ${item.tone}`} /></span><span className="text-sm font-semibold text-slate-700">{item.label}</span></span>
            <span className="flex items-center gap-2"><strong className={`text-lg ${item.tone}`}>{item.value}</strong><ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-600" /></span>
          </Link>
        ))}
      </div>

      <div className="no-print rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            งานค้างทั้งหมด
            <strong className="text-base">{pendingCount}</strong>
          </span>
          <span className="text-xs text-amber-900/80">นับรายการ DAR/CAR ที่ยังไม่ถึงสถานะจบงาน</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-amber-900 border border-amber-200">
            DAR <strong className="ml-1">{pendingDarCount}</strong>
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-amber-900 border border-amber-200">
            CAR <strong className="ml-1">{pendingCarCount}</strong>
          </span>
        </div>
      </div>

      {/* 2. Sticky Header (Only visible in Print View/Preview in Export Mode) */}
      {isExportMode && (
        <div className="no-print rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-blue-600" />
          <div>
            เลือกตัวกรอง แล้วกด <strong>&quot;ดาวน์โหลด Excel&quot;</strong>
          </div>
        </div>
      )}

      {/* 3. Interactive Filters Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="h-4 w-4 text-[#0F1059]" />
            ตัวกรองข้อมูล
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-500">
              <span>DAR <strong className="text-slate-800">{filteredDars.length}</strong></span>
              <span className="text-slate-300">|</span>
              <span>CAR <strong className="text-slate-800">{filteredCars.length}</strong></span>
              <span className="text-slate-300">|</span>
              <span>KPI <strong className="text-slate-800">{filteredKpis.length}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Audit <strong className="text-slate-800">{filteredAuditFindings.length}</strong></span>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-rose-600 h-7 text-xs gap-1" onClick={clearAllFilters}>
                <RotateCcw className="h-3 w-3" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4">
          {/* Year Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#0F1059]" />
              ปีประเมิน
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกปี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ปีทั้งหมด</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>ปี ค.ศ. {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#0F1059]" />
              แผนก
            </label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแผนก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกแผนก</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Form Filter (Doc Type) - Only for DAR */}
          {activeTab === "dar" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#0F1059]" />
                ประเภทเอกสาร
              </label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกประเภท</SelectItem>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : <div />}

          {/* Purpose Filter (Objective) - Only for DAR */}
          {activeTab === "dar" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#0F1059]" />
                วัตถุประสงค์
              </label>
              <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวัตถุประสงค์" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกวัตถุประสงค์</SelectItem>
                  {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : <div />}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
            <span className="text-[11px] text-slate-400 font-medium">ตัวกรองที่ใช้งาน:</span>
            {selectedYear !== currentYear && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F1059]/5 border border-[#0F1059]/10 px-2.5 py-1 text-[11px] font-medium text-[#0F1059]">
                <Calendar className="h-3 w-3" />
                ปี {selectedYear}
                <button onClick={() => setSelectedYear(currentYear)} className="ml-0.5 hover:text-[#0F1059]/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedDept !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F1059]/5 border border-[#0F1059]/10 px-2.5 py-1 text-[11px] font-medium text-[#0F1059]">
                <Building2 className="h-3 w-3" />
                {selectedDept}
                <button onClick={() => setSelectedDept("ALL")} className="ml-0.5 hover:text-[#0F1059]/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedForm !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F1059]/5 border border-[#0F1059]/10 px-2.5 py-1 text-[11px] font-medium text-[#0F1059]">
                <FileText className="h-3 w-3" />
                {DOC_TYPE_LABELS[selectedForm as keyof typeof DOC_TYPE_LABELS] || selectedForm}
                <button onClick={() => setSelectedForm("ALL")} className="ml-0.5 hover:text-[#0F1059]/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedPurpose !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F1059]/5 border border-[#0F1059]/10 px-2.5 py-1 text-[11px] font-medium text-[#0F1059]">
                <Filter className="h-3 w-3" />
                {OBJECTIVE_LABELS[selectedPurpose as keyof typeof OBJECTIVE_LABELS] || selectedPurpose}
                <button onClick={() => setSelectedPurpose("ALL")} className="ml-0.5 hover:text-[#0F1059]/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Tab Switcher Navigation (Hides when printing or in export print layout) */}
      <div className="flex border-b border-slate-200 gap-1.5 no-print">
        <button
          onClick={() => setActiveTab("dar")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "dar"
              ? "border-[#0F1059] text-[#0F1059] bg-slate-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          DAR Summary
        </button>
        <button
          onClick={() => setActiveTab("car")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "car"
              ? "border-[#0F1059] text-[#0F1059] bg-slate-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          CAR Summary
        </button>
        <button
          onClick={() => setActiveTab("kpi")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "kpi"
              ? "border-[#0F1059] text-[#0F1059] bg-slate-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          KPI / Monthly Summary
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "audit"
              ? "border-[#0F1059] text-[#0F1059] bg-slate-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Search className="h-4 w-4" />
          Audit Summary
        </button>
      </div>

      {/* 5. Charts Content Panels */}
      <div className="space-y-6 rounded-2xl bg-slate-50 p-1">
        {/* TAB 1: DAR */}
        {(activeTab === "dar" || isExportMode) && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
              activeTab !== "dar" && isExportMode ? "hidden md:hidden print:hidden" : ""
            }`}
          >
            <BarChart
              title="ปริมาณคำขอ DAR แยกตามแผนก (DAR Volume by Department)"
              data={darByDeptData}
              valueLabel="คำขอ"
              selected={selectedCharts.dar_by_dept}
              onToggleSelect={() => toggleChartSelection("dar_by_dept")}
              isExportMode={isExportMode}
            />
            <DonutChart
              title="สัดส่วนสถานะเอกสาร DAR (DAR Status Distribution)"
              data={darByStatusData}
              selected={selectedCharts.dar_by_status}
              onToggleSelect={() => toggleChartSelection("dar_by_status")}
              isExportMode={isExportMode}
            />
            <div className="md:col-span-2">
              <BarChart
                title="ประเภทของเอกสารที่ขอเปิด/แก้ไข (DAR Count by Document Type)"
                data={darByDocTypeData}
                valueLabel="เอกสาร"
                selected={selectedCharts.dar_by_type}
                onToggleSelect={() => toggleChartSelection("dar_by_type")}
                isExportMode={isExportMode}
              />
            </div>
          </div>
        )}

        {/* TAB 2: CAR */}
        {(activeTab === "car" || isExportMode) && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
              activeTab !== "car" && isExportMode ? "hidden md:hidden print:hidden" : ""
            }`}
          >
            <DonutChart
              title="อัตราส่วนการเปิดค้างและปิดสำเร็จของ CAR (CAR Status Ratio)"
              data={carStatusData}
              selected={selectedCharts.car_status}
              onToggleSelect={() => toggleChartSelection("car_status")}
              isExportMode={isExportMode}
            />
            <DonutChart
              title="สถิติความล่าช้าการแก้ไข CAR (CAR Overdue Rates)"
              data={carOverdueData}
              selected={selectedCharts.car_overdue}
              onToggleSelect={() => toggleChartSelection("car_overdue")}
              isExportMode={isExportMode}
            />
            <div className="md:col-span-2">
              <BarChart
                title="ปริมาณการออกใบ CAR ให้แผนกเป้าหมาย (CAR Count by Target Department)"
                data={carByDeptData}
                valueLabel="ใบ CAR"
                selected={selectedCharts.car_by_dept}
                onToggleSelect={() => toggleChartSelection("car_by_dept")}
                isExportMode={isExportMode}
              />
            </div>
          </div>
        )}

        {/* TAB 3: KPI */}
        {(activeTab === "kpi" || isExportMode) && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
              activeTab !== "kpi" && isExportMode ? "hidden md:hidden print:hidden" : ""
            }`}
          >
            <DonutChart
              title="สัดส่วนรายงานผลเปรียบเทียบกับเป้าหมาย KPI (KPI Achievement Status)"
              data={kpiPassFailData}
              selected={selectedCharts.kpi_pass_fail}
              onToggleSelect={() => toggleChartSelection("kpi_pass_fail")}
              isExportMode={isExportMode}
            />
            <div className="md:col-span-2">
              <KpiPerformanceChart
                title="ผลเฉลี่ยประเมินจริงเทียบกับเป้าหมาย KPI รายเดือน (Monthly KPI Performance Avg)"
                data={kpiMonthlyPerformance}
                selected={selectedCharts.kpi_perf}
                onToggleSelect={() => toggleChartSelection("kpi_perf")}
                isExportMode={isExportMode}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Audit */}
        {(activeTab === "audit" || isExportMode) && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
              activeTab !== "audit" && isExportMode ? "hidden md:hidden print:hidden" : ""
            }`}
          >
            <DonutChart
              title="ข้อบกพร่อง/ผลตรวจวิเคราะห์ตามระดับความรุนแรง (Finding Category Count)"
              data={auditFindingsCategoryData}
              selected={selectedCharts.audit_category}
              onToggleSelect={() => toggleChartSelection("audit_category")}
              isExportMode={isExportMode}
            />
            <DonutChart
              title="สถานะใบประเมินผลติดตามข้อบกพร่อง (Finding Status Distribution)"
              data={auditFindingsStatusData}
              selected={selectedCharts.audit_status}
              onToggleSelect={() => toggleChartSelection("audit_status")}
              isExportMode={isExportMode}
            />
            <div className="md:col-span-2">
              <BarChart
                title="จำนวนข้อบกพร่องที่พบแยกตามแผนก (Audit Findings by Target Department)"
                data={auditFindingsDeptData}
                valueLabel="จำนวนที่พบ"
                selected={selectedCharts.audit_dept}
                onToggleSelect={() => toggleChartSelection("audit_dept")}
                isExportMode={isExportMode}
              />
            </div>
          </div>
        )}
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-800">ส่งออก {activeTab.toUpperCase()} เฉพาะ Module นี้</p>
        </div>
        <Button onClick={handleExportExcel} disabled={isExportingExcel} className="bg-[#0F1059] text-white hover:bg-[#161875]">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {isExportingExcel ? "กำลังสร้าง Excel..." : `ดาวน์โหลด ${activeTab.toUpperCase()}`}
        </Button>
      </div>

      {/* 6. Print Footer (Only shown when browser printing is triggered) */}
      <div className="hidden print:block text-center text-xs text-slate-400 border-t border-slate-200 pt-4 mt-8">
        พิมพ์รายงานสรุปผลภาพรวม QMS ระบบอัตโนมัติ • ดึงข้อมูล ณ วันที่{" "}
        {new Date().toLocaleDateString("th-TH")} {new Date().toLocaleTimeString("th-TH")}
        {selectedYear !== "ALL" && ` • กรองเฉพาะปี ค.ศ. ${selectedYear}`}
        {selectedDept !== "ALL" && ` • กรองเฉพาะแผนก ${selectedDept}`}
      </div>
    </div>
  );
}
