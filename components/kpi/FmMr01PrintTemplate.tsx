"use client";

import React, { useState } from "react";
import KpiApprovalTimeline from "@/components/kpi/KpiApprovalTimeline";
import KpiMasterReviewDialog from "@/components/kpi/KpiMasterReviewDialog";
import KpiMasterAnnounceDialog from "@/components/kpi/KpiMasterAnnounceDialog";
import ConfirmModal from "@/components/common/ConfirmModal";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, RefreshCw, XCircle, Send, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { KpiApprovalSignature } from "@/components/kpi/KpiApprovalTimeline";
import type { FooterConfig } from "@/services/qmsConfigService";
import { formatKpiAnnualRevisionTag } from "@/lib/kpi-annual-document";

interface KPIObjective {
  id: string;
  target: number;
  unit: string | null;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
  isRevised?: boolean;
  isAdded?: boolean;
  revisionChangeType?: string | null;
}

interface RemovedObjective {
  id: string;
  revisionChangeType: "REMOVED";
  originalObjective: {
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
  };
}

interface KPI {
  id: string;
  yearly: number;
  department: string;
  status: string;
  submittedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  objectives?: KPIObjective[];
  removedObjectives?: RemovedObjective[];
  prepare: string;
  reviewer: string;
  approver: string;
}

interface FmMr01PrintTemplateProps {
  kpis: KPI[];
  year: number;
  mode?: string;
  role?: string;
  masterKpi?: KPI | null;
  signatures?: KpiApprovalSignature[];
  footerConfig?: FooterConfig | null;
  masterRevisionNo?: number;
  showReviewToolbar?: boolean;
  showWorkflow?: boolean;
  isEmbedded?: boolean;
}

export default function FmMr01PrintTemplate({
  kpis,
  year,
  mode,
  role,
  masterKpi,
  signatures = [],
  footerConfig,
  masterRevisionNo = 0,
  showReviewToolbar = true,
  showWorkflow,
  isEmbedded = false,
}: FmMr01PrintTemplateProps) {
  const router = useRouter();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [announceDialogOpen, setAnnounceDialogOpen] = useState(false);
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<"recall" | "resend" | null>(null);

  const formLabel = "วัตถุประสงค์คุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย";
  const formLabelEn = "Quality, Environment, Occupational Health and Safety Objectives";
  const footerLabel = footerConfig?.label?.trim() || "วัตถุประสงค์คุณภาพประจำปี";
  const footerPrefix = formatKpiAnnualRevisionTag(footerConfig?.prefix, masterRevisionNo);

  const isReviewMode = mode === "review";
  const canSubmitReview = isReviewMode && (!masterKpi || masterKpi.status === "DRAFT");
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const canManageReview = isReviewMode
    && isPrivileged
    && !!masterKpi
    && (masterKpi.status === "PENDING_REVIEW" || masterKpi.status === "PENDING_APPROVAL");
  const shouldShowReviewToolbar = isReviewMode && showReviewToolbar;
  const shouldShowWorkflow = showWorkflow ?? (isReviewMode && !!masterKpi);

  // Filter department KPIs having objectives for table rendering
  const activeKpis = kpis.filter(k => k.objectives && k.objectives.length > 0 && k.department !== "SYSTEM_MASTER");

  const hasRevisedObjectives = activeKpis.some(k => k.objectives?.some(o => o.isRevised));
  const canSubmitReviewAgain = isReviewMode && isPrivileged && !!masterKpi && (masterKpi.status === "APPROVED" || masterKpi.status === "ANNOUNCED") && hasRevisedObjectives;

  // Signatures mapping for the printout block
  const preparerSig = signatures.find(s => s.step === "PREPARER" && s.action === "APPROVED");
  const reviewerSig = signatures.find(s => s.step === "REVIEWER" && s.action === "APPROVED");
  const approverSig = signatures.find(s => s.step === "APPROVER" && s.action === "APPROVED");
  const updateDate = (() => {
    const value = masterKpi?.updatedAt ?? masterKpi?.submittedAt ?? null;
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
  })();

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleResend = async () => {
    if (!masterKpi) return;

    try {
      setActionBusy("resend");
      const res = await fetch(`/api/kpi/${masterKpi.id}/resend-notification`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Failed to resend notification");
      }

      toast.success(json?.message ?? "Resent successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend notification", { duration: Infinity });
    } finally {
      setActionBusy(null);
    }
  };

  const handleRecall = async () => {
    if (!masterKpi) return;

    try {
      setActionBusy("recall");
      const res = await fetch(`/api/kpi/${masterKpi.id}/recall`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Failed to cancel review");
      }

      toast.success(json?.message ?? "Cancelled successfully");
      setRecallConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel review", { duration: Infinity });
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4 landscape;
          margin: 10mm 8mm 8mm 8mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 10px;
          color: #000;
          line-height: 1.2;
          background-color: #f8fafc;
        }
 
        .print-container {
          width: 100%;
          max-width: 280mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 10mm 8mm;
        }
 
        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }
 
        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 4px 5px;
          vertical-align: middle;
        }
 
        .print-container th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
 
        .print-container .text-center {
          text-align: center;
        }
 
        .print-container .text-left {
          text-align: left;
        }
 
        .print-container .text-right {
          text-align: right;
        }
 
        .print-container .font-bold {
          font-weight: bold;
        }
 
        .print-container .bg-gray {
          background-color: #f3f4f6;
        }
 
        .print-container .logo-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px;
        }
 
        .print-container .footer-note {
          font-size: 8px;
          text-align: right;
          margin-top: 6px;
          font-family: Arial, sans-serif;
          color: transparent;
        }

        .print-container .footer-note::after {
          content: attr(data-footer);
          color: #000;
        }
 
        @media print {
          body {
            background-color: #fff;
          }
          .print-container {
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .no-print-export {
            display: none !important;
          }
        }
        `
      }} />

      {/* Sticky Top Review Toolbar */}
      {shouldShowReviewToolbar && (
        <div className="no-print bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5 px-6 sticky top-0 z-[100] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="max-w-[280mm] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 h-9 font-semibold text-xs gap-1"
                onClick={() => router.push("/qms/kpi")}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                กลับหน้า KPI / Back
              </Button>
              <div className="h-6 w-px bg-slate-200 hidden md:block" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">โหมดการตรวจสอบ / Review Mode: FM-MR-01 ({year})</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">สถานะเอกสาร Master: {masterKpi?.status || "ยังไม่ได้เริ่มรีวิว"} / Master Document Status: {masterKpi?.status || "Not started review"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {canManageReview && (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                    disabled={actionBusy !== null}
                    onClick={() => setRecallConfirmOpen(true)}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    ยกเลิกรีวิว / Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                    disabled={actionBusy !== null}
                    onClick={handleResend}
                  >
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${actionBusy === "resend" ? "animate-spin" : ""}`} />
                    ส่งอีกครั้ง / Resend
                  </Button>
                </>
              )}

              {canSubmitReview && isPrivileged && (
                <Button
                className="bg-[#0F1059] hover:bg-[#161875] text-white font-semibold px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(15,16,89,0.2)] shrink-0 transition-transform active:scale-[0.98]"
                onClick={() => setReviewDialogOpen(true)}
                >
                  <FileText className="w-4 h-4" />
                ส่งขอรีวิว / Submit Review
                </Button>
              )}

              {(masterKpi?.status === "APPROVED" || masterKpi?.status === "ANNOUNCED") && isPrivileged && (
                <Button
                  className="bg-[#0F1059] hover:bg-[#161875] text-white font-semibold px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(15,16,89,0.2)] shrink-0 transition-transform active:scale-[0.98]"
                  onClick={() => setAnnounceDialogOpen(true)}
                >
                  <Send className="w-4 h-4" />
                  {masterKpi?.status === "ANNOUNCED" ? "ส่งประกาศอีกครั้ง / Resend" : "ประกาศใช้ / Announce"}
                </Button>
              )}

              {canSubmitReviewAgain && (
                <Button
                  className="bg-[#0F1059] hover:bg-[#161875] text-white font-semibold px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(15,16,89,0.2)] shrink-0 transition-transform active:scale-[0.98]"
                  onClick={() => setReviewDialogOpen(true)}
                >
                  <FileText className="w-4 h-4" />
                  ส่งรีวิวใหม่อีกรอบ / Submit Review Again
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={isEmbedded ? "bg-slate-100 rounded-2xl border border-slate-200 p-4 md:p-6 overflow-x-auto" : "py-8 bg-slate-50 min-h-screen"}>
        {!isEmbedded && (
          <div className="no-print mx-auto mb-4 flex max-w-[280mm] justify-end gap-3 px-4">
            <Button type="button" className="bg-[#0F1059] hover:bg-[#161875] text-white h-9 rounded-xl font-medium px-5" onClick={() => window.print()}>
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl font-medium px-5 bg-white border-slate-200 text-slate-700 gap-1.5"
              onClick={() => window.open(`/api/kpi/export/fm-mr-01?year=${year}`, "_blank")}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        )}

        <div className="print-container">
          {/* Header Block */}
          <table style={{ marginBottom: "8px" }}>
            <tbody>
              <tr>
                <td style={{ width: "20%", textAlign: "left", padding: "4px" }}>
                  <div className="logo-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/logo.webp" alt="Logo" style={{ height: "30px", objectFit: "contain" }} />
                  </div>
                </td>
                <td style={{ width: "60%", textAlign: "center" }}>
                  <div className="font-bold" style={{ fontSize: "14px", color: "#0F1059" }}>{formLabel} {year}</div>
                  <div className="font-bold" style={{ fontSize: "12px", color: "#0f1059" }}>{formLabelEn} {year}</div>
                </td>
                <td style={{ width: "20%", padding: 0, fontSize: "9px" }}>
                  <table style={{ marginBottom: 0, height: "100%" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "48%", padding: "3px 4px", fontSize: "8px", fontWeight: "bold" }}>
                          แผนงานประจำปี<br />Annual Work Plan
                        </td>
                        <td style={{ width: "52%", padding: "3px 4px", fontSize: "12px", fontWeight: "bold", color: "#0F59A4", textAlign: "center" }}>
                          {year}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 4px", fontSize: "8px", fontWeight: "bold" }}>
                          หน่วยงาน<br />Department
                        </td>
                        <td style={{ padding: "3px 4px", fontSize: "11px", color: "#0F59A4", textAlign: "center" }}>
                          All Department
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 4px", fontSize: "8px", fontWeight: "bold" }}>
                          แก้ไขครั้งที่<br />Revision No.
                        </td>
                        <td style={{ padding: "3px 4px", fontSize: "11px", fontWeight: "bold", color: "#0F59A4", textAlign: "center" }}>
                          {footerPrefix.replace(/^.*\s(Rev\.\d+)$/i, "$1")}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 4px", fontSize: "8px", fontWeight: "bold" }}>
                          วันที่ปรับปรุง<br />Update date
                        </td>
                        <td style={{ padding: "3px 4px", fontSize: "11px", fontWeight: "bold", color: "#0F59A4", textAlign: "center" }}>
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
          <table style={{ marginBottom: "12px" }}>
            <thead>
              <tr style={{ fontSize: "9.5px" }}>
                <th style={{ width: "15%" }} className="text-center">หน่วยงาน<br/>Departments</th>
                <th style={{ width: "25%" }} className="text-center">วัตถุประสงค์และเป้าหมาย<br/>Objectives and Targets</th>
                <th style={{ width: "12%" }} className="text-center">สูตรการคำนวณ<br/>Calculation Formula</th>
                <th style={{ width: "20%" }} className="text-center">แนวทางแผนการดำเนินงาน<br/>Action Plan Guidelines</th>
                <th style={{ width: "8%" }} className="text-center">ความถี่ในการวัดผล<br/>Measurement Frequency</th>
                <th style={{ width: "10%" }} className="text-center">เอกสารอ้างอิง<br/>Reference Documents</th>
                <th style={{ width: "10%" }} className="text-center">ผู้รับผิดชอบ<br/>Responsible Person</th>
              </tr>
            </thead>
            <tbody>
              {activeKpis.map((kpi) => {
                const removedObjectives = kpi.removedObjectives ?? [];
                const departmentRowSpan = (kpi.objectives?.length ?? 0) + removedObjectives.length;

                return (
                  <React.Fragment key={kpi.id}>
                    {kpi.objectives!.map((obj, idx) => {
                      const isHighlighted = obj.revisionChangeType === "UPDATED" || obj.revisionChangeType === "ADDED";
                      const cellBg = isHighlighted ? "#e2f0d9" : undefined;
                      const printColor = isHighlighted ? "exact" : undefined;
                      return (
                        <tr
                          key={obj.id}
                          style={{
                            fontSize: "9px",
                            fontWeight: isHighlighted ? "bold" : "normal",
                            fontStyle: isHighlighted ? "italic" : "normal",
                            textDecoration: obj.revisionChangeType === "ADDED" ? "underline" : undefined,
                            color: isHighlighted ? "#166534" : undefined,
                          }}
                        >
                          {idx === 0 && (
                            <td rowSpan={departmentRowSpan} className="text-center font-bold" style={{ verticalAlign: "top" }}>
                              {kpi.department}
                            </td>
                          )}
                          <td style={{ backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>
                            <div><strong>{obj.objective} {obj.target} {obj.unit || ""}</strong></div>
                          </td>
                          <td style={{ whiteSpace: "pre-line", backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>{obj.calculationFormula}</td>
                          <td style={{ whiteSpace: "pre-line", backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>{obj.actionPlanGuidelines}</td>
                          <td className="text-center" style={{ backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>{obj.frequency}</td>
                          <td className="text-center" style={{ backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>{obj.referenceDocuments || "-"}</td>
                          <td className="text-center" style={{ backgroundColor: cellBg, WebkitPrintColorAdjust: printColor, printColorAdjust: printColor }}>
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
                      );
                    })}

                    {removedObjectives.map((removed) => (
                      <tr
                        key={removed.id}
                        style={{
                          fontSize: "9px",
                          fontWeight: "bold",
                          fontStyle: "italic",
                          color: "#b91c1c",
                        }}
                      >
                        <td style={{ backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <div><strong>{removed.originalObjective.objective} {removed.originalObjective.target} {removed.originalObjective.unit || ""} (Deleted)</strong></div>
                        </td>
                        <td style={{ whiteSpace: "pre-line", backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{removed.originalObjective.calculationFormula}</td>
                        <td style={{ whiteSpace: "pre-line", backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{removed.originalObjective.actionPlanGuidelines}</td>
                        <td className="text-center" style={{ backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{removed.originalObjective.frequency}</td>
                        <td className="text-center" style={{ backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{removed.originalObjective.referenceDocuments || "-"}</td>
                        <td className="text-center" style={{ backgroundColor: "#fee2e2", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          {(removed.originalObjective.responsibleNameSnapshot || removed.originalObjective.responsibleEmailSnapshot) ? (
                            <>
                              {removed.originalObjective.responsibleNameSnapshot || removed.originalObjective.responsibleEmailSnapshot}
                              {removed.originalObjective.responsibleEmployeeId ? <br /> : ""}
                              {removed.originalObjective.responsibleEmployeeId ? `(#${removed.originalObjective.responsibleEmployeeId})` : ""}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              
              {activeKpis.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-4">
                    ไม่มีข้อมูลสำหรับปี {year} / No data for {year}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {shouldShowWorkflow && masterKpi && (
            <div className="no-print-export mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-800">Approval Workflow</div>
                <div className="text-xs text-slate-500">Current status: {masterKpi.status}</div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <KpiApprovalTimeline
                    signatures={signatures}
                    preparerName={masterKpi.prepare}
                    reviewerName={masterKpi.reviewer}
                    approverName={masterKpi.approver}
                    layout="horizontal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Signatures Block */}
          {masterKpi && masterKpi.status !== "DRAFT" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px", marginBottom: "12px" }}>
              <table style={{ width: "48%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                  <td style={{ width: "33%", border: "1px solid #000", padding: "8px 6px", textAlign: "center", verticalAlign: "top" }}>
                    <div className="font-bold">ผู้จัดทำ / Prepared By</div>
                    <div style={{ height: "52px", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
                      {preparerSig?.signaturePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preparerSig.signaturePath} alt="Preparer Signature" style={{ maxHeight: "42px", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#94a3b8" }}>ยังไม่ได้ลงชื่อ / Unsigned</span>
                      )}
                    </div>
                    <div className="font-bold">({masterKpi.prepare})</div>
                    <div style={{ fontSize: "8px", color: "#475569", marginTop: "4px" }}>วันที่ / Date: {formatDate(preparerSig?.actionDate)}</div>
                  </td>
                  <td style={{ width: "33%", border: "1px solid #000", padding: "8px 6px", textAlign: "center", verticalAlign: "top" }}>
                    <div className="font-bold">ผู้ตรวจสอบ / Reviewed By</div>
                    <div style={{ height: "52px", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
                      {reviewerSig?.signaturePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reviewerSig.signaturePath} alt="Reviewer Signature" style={{ maxHeight: "42px", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#94a3b8" }}>ยังไม่ได้ลงชื่อ / Unsigned</span>
                      )}
                    </div>
                    <div className="font-bold">({masterKpi.reviewer})</div>
                    <div style={{ fontSize: "8px", color: "#475569", marginTop: "4px" }}>วันที่ / Date: {formatDate(reviewerSig?.actionDate)}</div>
                  </td>
                  <td style={{ width: "33%", border: "1px solid #000", padding: "8px 6px", textAlign: "center", verticalAlign: "top" }}>
                    <div className="font-bold">ผู้อนุมัติ / Approved By</div>
                    <div style={{ height: "52px", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
                      {approverSig?.signaturePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={approverSig.signaturePath} alt="Approver Signature" style={{ maxHeight: "42px", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#94a3b8" }}>ยังไม่ได้ลงชื่อ / Unsigned</span>
                      )}
                    </div>
                    <div className="font-bold">({masterKpi.approver})</div>
                    <div style={{ fontSize: "8px", color: "#475569", marginTop: "4px" }}>วันที่ / Date: {formatDate(approverSig?.actionDate)}</div>
                  </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer prefix and label */}
          <div className="footer-note" data-footer={`${footerPrefix} ${footerLabel}`}>
            {footerPrefix} / วัตถุประสงค์คุณภาพประจำปี
          </div>
        </div>
      </div>

      {reviewDialogOpen && (
        <KpiMasterReviewDialog
          open={reviewDialogOpen}
          onClose={() => setReviewDialogOpen(false)}
          year={year}
          kpis={kpis as unknown as Parameters<typeof KpiMasterReviewDialog>[0]["kpis"]}
          masterRevisionNo={masterRevisionNo}
          footerConfig={footerConfig}
          masterUpdatedAt={masterKpi?.updatedAt ?? masterKpi?.submittedAt ?? null}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {announceDialogOpen && masterKpi && (
        <KpiMasterAnnounceDialog
          open={announceDialogOpen}
          onClose={() => setAnnounceDialogOpen(false)}
          kpiId={masterKpi.id}
          year={year}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {recallConfirmOpen && (
        <ConfirmModal
          title="Cancel review request"
          message="This will recall FM-MR-01 back to Draft and invalidate the current reviewer or approver link."
          confirmLabel="Cancel Review"
          cancelLabel="Keep Request"
          loading={actionBusy === "recall"}
          danger
          onConfirm={handleRecall}
          onCancel={() => {
            if (actionBusy !== "recall") {
              setRecallConfirmOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
