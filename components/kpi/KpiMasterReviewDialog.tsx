"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/shared/SignaturePad";
import { Search, X, Loader2, User, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import type { KpiWithUsers } from "@/hooks/api/use-kpi";
import type { FooterConfig } from "@/services/qmsConfigService";
import { formatKpiAnnualRevisionTag } from "@/lib/kpi-annual-document";

export interface KPIObjectiveData {
  id: string;
  objective: string;
  target: number;
  unit: string | null;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
}

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
  kpis: Array<KpiWithUsers & { objectives?: unknown[] }>;
  masterRevisionNo?: number;
  footerConfig?: FooterConfig | null;
  masterUpdatedAt?: string | Date | null;
  onSuccess: () => void;
}

function useUserSearch(query: string) {
  const [results, setResults] = useState<ReviewerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}

function getCandidateMeta(user: ReviewerCandidate) {
  const suffix = user.jobTitle ?? user.email ?? "Local only";
  return user.employeeId ? `${user.employeeId} · ${suffix}` : suffix;
}

interface UserPickerProps {
  label: string;
  value: ReviewerCandidate | null;
  onChange: (user: ReviewerCandidate | null) => void;
}

function UserPicker({ label, value, onChange }: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useUserSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(user: ReviewerCandidate) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F1059]">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{value.name}</p>
            <p className="truncate text-xs text-slate-400">{getCandidateMeta(value)}</p>
          </div>
          <button onClick={clear} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน... / Search name or employee ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-[#0F1059] focus:bg-white focus:outline-none"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {open && (
            <div
              ref={dropdownRef}
              className="absolute top-full z-[9999] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {results.length === 0 ? (
                <p className="px-4 py-3 text-center text-sm text-slate-400">
                  {loading ? "กำลังค้นหา... / Searching..." : "ไม่พบผู้ใช้ / User not found"}
                </p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-50 overflow-y-auto">
                  {results.map((u) => (
                    <li
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        select(u);
                      }}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="truncate text-xs text-slate-400">{getCandidateMeta(u)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KpiMasterReviewDialog({
  open,
  onClose,
  year,
  kpis = [],
  masterRevisionNo = 0,
  footerConfig,
  masterUpdatedAt,
  onSuccess,
}: Props) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerCandidate | null>(null);
  const [approver, setApprover] = useState<ReviewerCandidate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setStep(1);
    setSignatureDataUrl(null);
    setReviewer(null);
    setApprover(null);
    onClose();
  };

  const handleConfirmSignature = async (
    dataUrl: string,
    _type: string,
    _saveToProfile: boolean
  ) => {
    setSignatureDataUrl(dataUrl);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!signatureDataUrl || !reviewer || !approver) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน / Please complete all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kpi/master-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearly: year,
          signatureDataUrl,
          reviewer: { id: reviewer.id, name: reviewer.name, email: reviewer.email },
          approver: { id: approver.id, name: approver.name, email: approver.email },
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? t("common.error"));
      }

      toast.success("ส่งข้อมูลตรวจสอบและอนุมัติเรียบร้อยแล้ว / Master KPI review request submitted successfully");
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-filter KPIs that have objectives
  const activeKpis = kpis.filter(k => k.objectives && (k.objectives as KPIObjectiveData[]).length > 0);
  const revisionTag = formatKpiAnnualRevisionTag(footerConfig?.prefix, masterRevisionNo);
  const updateDate = (() => {
    if (!masterUpdatedAt) return "-";
    const date = new Date(masterUpdatedAt);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-visible rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            ลงนามตรวจสอบและอนุมัติวัตถุประสงค์คุณภาพ (FM-MR-01) / Review & Sign Quality Objectives Master (FM-MR-01) — Year {year}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {/* Preview Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">แสดงตัวอย่างเอกสารส่งออก / Preview Export (FM-MR-01)</h3>
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-[40vh] p-4 bg-white">
                <div className="w-full min-w-[800px] text-[10px] text-black leading-tight">
                  {/* Header Block Table */}
                  <table className="w-full border-collapse mb-2 border border-black text-xs">
                    <tbody>
                      <tr>
                        <td className="w-1/5 text-left p-2 border border-black align-middle">
                          <div className="flex items-center justify-start p-0.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo/logo.webp" alt="Logo" className="h-6 object-contain" />
                          </div>
                        </td>
                        <td className="w-3/5 text-center p-2 border border-black align-middle">
                          <div className="font-bold text-[11px] text-[#0F1059]">วัตถุประสงค์คุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย {year}</div>
                          <div className="font-bold text-[9px] text-[#0f1059]">Quality, Environment, Occupational Health and Safety Objectives {year}</div>
                        </td>
                        <td className="w-1/5 p-0 border border-black text-[9px] align-middle">
                          <table className="w-full h-full border-collapse text-[9px]">
                            <tbody>
                              <tr>
                                <td className="w-[48%] p-1 border border-black font-bold text-[8px]">
                                  แผนงานประจำปี
                                  <br />
                                  Annual Work Plan
                                </td>
                                <td className="w-[52%] p-1 border border-black text-center text-[12px] font-bold text-[#0F59A4]">
                                  {year}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1 border border-black font-bold text-[8px]">
                                  หน่วยงาน
                                  <br />
                                  Department
                                </td>
                                <td className="p-1 border border-black text-center text-[11px] text-[#0F59A4]">
                                  All Department
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1 border border-black font-bold text-[8px]">
                                  แก้ไขครั้งที่
                                  <br />
                                  Revision No.
                                </td>
                                <td className="p-1 border border-black text-center text-[11px] font-bold text-[#0F59A4]">
                                  {revisionTag.replace(/^.*\s(Rev\.\d+)$/i, "$1")}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1 border border-black font-bold text-[8px]">
                                  วันที่ปรับปรุง
                                  <br />
                                  Update date
                                </td>
                                <td className="p-1 border border-black text-center text-[11px] font-bold text-[#0F59A4]">
                                  {updateDate}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Objectives Table */}
                  <table className="w-full border-collapse mb-1 border border-black text-[10px]">
                    <thead>
                      <tr className="bg-gray-100 font-bold border border-black text-[9.5px]">
                        <th style={{ width: "15%" }} className="text-center p-1.5 border border-black font-bold">หน่วยงาน<br/>Departments</th>
                        <th style={{ width: "25%" }} className="text-center p-1.5 border border-black font-bold">วัตถุประสงค์และเป้าหมาย<br/>Objectives and Targets</th>
                        <th style={{ width: "12%" }} className="text-center p-1.5 border border-black font-bold">สูตรการคำนวณ<br/>Calculation Formula</th>
                        <th style={{ width: "20%" }} className="text-center p-1.5 border border-black font-bold">แนวทางแผนการดำเนินงาน<br/>Action Plan Guidelines</th>
                        <th style={{ width: "8%" }} className="text-center p-1.5 border border-black font-bold">ความถี่ในการวัดผล<br/>Measurement Frequency</th>
                        <th style={{ width: "10%" }} className="text-center p-1.5 border border-black font-bold">เอกสารอ้างอิง<br/>Reference Documents</th>
                        <th style={{ width: "10%" }} className="text-center p-1.5 border border-black font-bold">ผู้รับผิดชอบ<br/>Responsible Person</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeKpis.map((kpi) =>
                        (kpi.objectives as KPIObjectiveData[]).map((obj, idx) => (
                          <tr key={obj.id} className="text-[9px]">
                            {idx === 0 && (
                              <td
                                rowSpan={(kpi.objectives as KPIObjectiveData[]).length}
                                className="text-center font-bold p-1.5 border border-black align-top"
                              >
                                {kpi.department}
                              </td>
                            )}
                            <td className="p-1.5 border border-black align-top">
                              <div><strong>{obj.objective} {obj.target} {obj.unit || ""}</strong></div>
                            </td>
                            <td className="p-1.5 border border-black align-top whitespace-pre-line">
                              {obj.calculationFormula}
                            </td>
                            <td className="p-1.5 border border-black align-top whitespace-pre-line">
                              {obj.actionPlanGuidelines}
                            </td>
                            <td className="p-1.5 border border-black align-top text-center">
                              {obj.frequency}
                            </td>
                            <td className="p-1.5 border border-black align-top text-center">
                              {obj.referenceDocuments || "-"}
                            </td>
                            <td className="p-1.5 border border-black align-top text-center">
                              {(obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot) ? (
                                <>
                                  {obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot}
                                  {obj.responsibleEmployeeId ? <br /> : ""}
                                  {obj.responsibleEmployeeId ? `(#${obj.responsibleEmployeeId})` : ""}
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                      {activeKpis.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-slate-400 py-8 border border-black">
                            ไม่มีข้อมูลเป้าหมายประจำปี {year} / No annual objectives data for {year}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="text-[8px] text-right mt-1.5 font-sans">
                    {revisionTag} / วัตถุประสงค์คุณภาพประจำปี
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">วาดลายเซ็นของคุณ (Preparer Signature) / Draw your signature (Preparer Signature)</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <SignaturePad
                  onCancel={handleClose}
                  onConfirm={handleConfirmSignature}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
            {/* Signature Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check className="h-4 w-4" /> ลงชื่อเตรียมเอกสารสำเร็จ / Signature confirmed
              </div>
              {signatureDataUrl && (
                <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureDataUrl}
                    alt="Signature Preview"
                    className="max-h-20 object-contain mx-auto"
                  />
                </div>
              )}
            </div>

            {/* Select Reviewer & Approver */}
            <div className="space-y-4">
              <UserPicker
                label="เลือกผู้ตรวจสอบ (Reviewer) / Select Reviewer"
                value={reviewer}
                onChange={setReviewer}
              />
              <UserPicker
                label="เลือกผู้อนุมัติ (Approver) / Select Approver"
                value={approver}
                onChange={setApprover}
              />
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 shrink-0">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                ย้อนกลับ
              </Button>
              <Button
                className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
                onClick={handleSubmit}
                disabled={submitting || !reviewer || !approver}
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                ส่งข้อมูลขออนุมัติ
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
